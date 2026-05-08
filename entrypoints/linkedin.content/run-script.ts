import {
  aaError,
  aaLog,
  aaWarn,
  addDelay,
  captureDebugHtml,
  clickElement,
  getElementsByXPath,
  getVisibleElementByXPath,
  isElementVisible,
} from './dom-utils';
import {
  detectJobsUI,
  extractCompanyNameFromItem,
  extractJobTitleFromItem,
  findJobItemByJobId,
  getJobIdFromItem,
  getJobItemClickTarget,
  getJobsListScrollContainer,
  getPaginationInfo,
  isItemAlreadyApplied,
  isJobsSearchPage,
  waitForJobDetailsLoaded,
  waitForJobItems,
} from './linkedin-dom';
import {
  closeApplicationSentModal,
  ensureNoApplicationModalOpen,
  findApplicationSentModal,
  findSduiApplyModal,
  performSafetyReminderCheck,
  terminateJobModel,
  waitForApplicationSentModal,
  waitForJobsLoaderToDisappearAndHandle,
  clickDoneIfExist,
} from './modals';
import { waitForJobsLoaderToDisappear, waitForLoaderToDisappear, toggleBlinkingBorder } from './loaders';
import { handleSaveApplicationModal } from './save-modal';
import {
  checkForFormValidationError,
  runValidations,
  selectCvFile,
  uncheckFollowCompany,
} from './form-fillers';
import { matchesFilter } from '@/lib/text-filters';
import { recordApplyHistoryEntry } from '@/lib/apply-history';
import { sendMessage } from '@/lib/messaging';
import { AA_UI_UNKNOWN } from '@/lib/constants';
import {
  badWordsStorage,
  badWordsEnabledStorage,
  defaultFieldsStorage,
  lastJobSearchUrlStorage,
  titleFilterEnabledStorage,
  titleFilterWordsStorage,
  titleSkipEnabledStorage,
  titleSkipWordsStorage,
} from '@/lib/storage';
import { EASY_APPLY_BUTTON_XPATH, NOT_EASY_APPLY_BUTTON_XPATH } from '@/lib/xpaths';
import type { ContentRunState } from './run-state';

export async function checkLimitReached(): Promise<boolean> {
  const feedbackMessageElement = document.querySelector('.artdeco-inline-feedback__message');
  if (!feedbackMessageElement) return false;
  const textContent = feedbackMessageElement.textContent || '';
  const searchString = "You've exceeded the daily application limit";
  return textContent.includes(searchString);
}

export async function checkAndPromptFields(): Promise<boolean> {
  try {
    const defaults = await defaultFieldsStorage.getValue();
    return Boolean(defaults && Object.keys(defaults).length > 0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.trace('Error in checkAndPromptFields: ' + message);
    return false;
  }
}

export async function fillSearchFieldIfEmpty(state: ContentRunState): Promise<void> {
  if (!(await state.checkAndPrepareRunState())) return;
  const inputElement = document.querySelector('[id*="jobs-search-box-keyword"]');
  if (!(inputElement instanceof HTMLInputElement)) return;
  if (!state.prevSearchValue) return;
  if (inputElement.value.trim()) return;

  inputElement.focus();
  await addDelay(2000);
  inputElement.value = state.prevSearchValue;
  await addDelay(100);
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  await addDelay(100);
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  await addDelay(100);

  const lists = document.querySelectorAll('[class*="typeahead-results"] > li');
  for (const list of lists) {
    if (list instanceof HTMLElement) list.click();
  }
}

export async function clickJob(
  state: ContentRunState,
  listItem: HTMLElement,
  companyName: string,
  jobTitle: string,
  badWordsEnabled: boolean,
): Promise<void> {
  try {
    await state.updateScriptActivity();
    await waitForJobsLoaderToDisappear();

    const isRunning = await state.checkAndPrepareRunState();
    if (!isRunning) return;

    if (badWordsEnabled) {
      const jobDetailsElement = document.querySelector('[class*="jobs-box__html-content"]');
      if (jobDetailsElement) {
        const jobContentText = (jobDetailsElement.textContent || '').toLowerCase().trim();
        const badWords = await badWordsStorage.getValue();
        if (badWords && badWords.length > 0) {
          let matchedBadWord: string | null = null;
          for (const badWord of badWords) {
            const regex = new RegExp(
              '\\b' + badWord.trim().replace(/\+/g, '\\+') + '\\b',
              'i',
            );
            if (regex.test(jobContentText)) {
              matchedBadWord = badWord;
              break;
            }
          }
          if (matchedBadWord) {
            aaLog('clickJob', 'bad-word match in description', { jobTitle, matchedBadWord });
            const jobId = getJobIdFromItem(listItem);
            await recordApplyHistoryEntry({
              jobId,
              title: jobTitle,
              companyName,
              url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
              applied: false,
              reason: 'badWord',
              description: `Matched bad word in job description: "${matchedBadWord}"`,
            });
            return;
          }
        }
      }
    }

    await runFindEasyApply(state, jobTitle, companyName, listItem);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    aaError('clickJob', 'unhandled error', message);
    try {
      const jobId = getJobIdFromItem(listItem);
      await recordApplyHistoryEntry({
        jobId,
        title: jobTitle,
        companyName,
        url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
        applied: false,
        reason: 'error',
        description: `clickJob exception: ${message}`,
        debugHtml: captureDebugHtml(listItem),
      });
    } catch {
      // tracking failure must not break the flow
    }
  }
}

export async function runApplyModelLogic(
  state: ContentRunState,
  jobTitle: string,
): Promise<void> {
  await addDelay();
  await performSafetyReminderCheck();

  const saveModalHandled = await handleSaveApplicationModal(state);
  if (saveModalHandled) return;

  let applyModal: HTMLElement | null = findSduiApplyModal();
  const isShadowApply = !!applyModal;
  if (!applyModal) {
    const modalEl = document.querySelector('.artdeco-modal');
    if (modalEl instanceof HTMLElement) {
      applyModal = modalEl;
    } else {
      const start = Date.now();
      while (Date.now() - start < 3000) {
        const fresh = document.querySelector('.artdeco-modal');
        if (fresh instanceof HTMLElement && isElementVisible(fresh)) {
          applyModal = fresh;
          break;
        }
        await addDelay(150);
      }
    }
  }

  if (applyModal) {
    state.applyOutcome.reachedModal = true;
    aaLog('runApplyModelLogic', 'apply modal located', {
      ui: isShadowApply ? 'shadow-SDUI' : 'artdeco',
      inputs: applyModal.querySelectorAll('input, select, textarea').length,
      buttons: applyModal.querySelectorAll('button').length,
    });

    const continueApplyingButton = applyModal.querySelector(
      'button[aria-label="Continue applying"]',
    );

    if (continueApplyingButton instanceof HTMLElement) {
      continueApplyingButton.scrollIntoView({ block: 'center' });
      await addDelay(500);
      continueApplyingButton.click();
      await runApplyModel(state, jobTitle);
    }

    const nextButton = Array.from(applyModal.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Next'),
    );

    const reviewButtonInModal = applyModal.querySelector(
      'button[aria-label="Review your application"]',
    );
    const reviewButton =
      reviewButtonInModal instanceof HTMLElement &&
      reviewButtonInModal.offsetParent !== null
        ? reviewButtonInModal
        : null;

    const submitButtonInModal = applyModal.querySelector(
      'button[aria-label="Submit application"]',
    );
    const submitButton =
      submitButtonInModal instanceof HTMLElement &&
      submitButtonInModal.offsetParent !== null
        ? submitButtonInModal
        : null;

    if (submitButton) {
      await uncheckFollowCompany();

      const isStillRunning = await state.checkAndPrepareRunState();
      if (!isStillRunning) return;

      if (!isElementVisible(submitButton)) {
        submitButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
        await addDelay(1000);
      }

      let clicked = false;
      let clickAttempts = 0;
      const maxAttempts = 3;
      while (clickAttempts < maxAttempts) {
        if (isElementVisible(submitButton)) {
          await clickElement({ elementOrSelector: submitButton });
          clicked = true;
          state.applyOutcome.submitClicked = true;
          aaLog('runApplyModelLogic', 'Submit application clicked');
          break;
        } else {
          submitButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
          await addDelay(800);
          clickAttempts++;
        }
      }

      if (!clicked) {
        aaWarn('runApplyModelLogic', 'Submit found but never visible enough to click');
      }

      await waitForJobsLoaderToDisappear();

      if (clicked) {
        const sent = await waitForApplicationSentModal(8000);
        if (sent) {
          state.applyOutcome.sentModalDetected = true;
          aaLog('runApplyModelLogic', 'Application sent modal detected');
        } else {
          aaWarn(
            'runApplyModelLogic',
            'Submit was clicked but "Your application was sent" modal never appeared — submission may not have landed',
          );
        }
      }

      await addDelay(1500);
      await handleSaveApplicationModal(state);
      const isStillRunning2 = await state.checkAndPrepareRunState();
      if (!isStillRunning2) return;

      const sentModal = findApplicationSentModal();
      const sduiClose = sentModal?.querySelector(
        'button[aria-label="Dismiss"], button[aria-label="Close"]',
      );
      const artdecoClose = document.querySelector('.artdeco-modal__dismiss');
      const modalCloseButton = (sduiClose as HTMLElement | null) || (artdecoClose as HTMLElement | null);
      if (modalCloseButton instanceof HTMLElement) {
        modalCloseButton.scrollIntoView({ block: 'center' });
        await addDelay(300);
        modalCloseButton.click();
      }
      await clickDoneIfExist();
    }

    if (nextButton || reviewButton) {
      const buttonToClick = (reviewButton || nextButton) as HTMLElement;
      await selectCvFile(applyModal, jobTitle);
      await runValidations(state, applyModal);
      const isError = await checkForFormValidationError();
      if (isError) {
        await terminateJobModel(state);
      } else {
        if (!isElementVisible(buttonToClick)) {
          buttonToClick.scrollIntoView({ block: 'center', behavior: 'smooth' });
          await addDelay(1000);
        }
        if (
          buttonToClick &&
          buttonToClick.isConnected &&
          isElementVisible(buttonToClick)
        ) {
          await clickElement({ elementOrSelector: buttonToClick });
          await waitForJobsLoaderToDisappear();
        }
        await addDelay(1000);
        const saveModalAfterNext = await handleSaveApplicationModal(state);
        if (saveModalAfterNext) {
          aaLog('Save modal detected after next button click');
        }
        await runApplyModel(state, jobTitle);
      }

      const secondaryBtn = document.querySelector('button[data-test-dialog-secondary-btn]');
      if (
        secondaryBtn instanceof HTMLElement &&
        secondaryBtn.innerText.includes('Discard')
      ) {
        await terminateJobModel(state);
        return;
      }
    }
  }

  await handleSaveApplicationModal(state);

  if (!document.querySelector('.artdeco-modal')) return;

  const modalsToClose = Array.from(document.querySelectorAll('.artdeco-modal'));
  for (const modal of modalsToClose) {
    await addDelay(1000);
    if (modal instanceof HTMLElement) {
      await terminateJobModel(state, modal);
    }
  }
  await addDelay(1000);

  const artdecoModal = document.querySelector('[class*="artdeco-modal"]');
  if (artdecoModal) {
    const buttons = artdecoModal.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent?.trim()?.includes('No thanks')) {
        button.click();
        return;
      }
    }
  }
}

export async function runApplyModel(
  state: ContentRunState,
  jobTitle: string,
): Promise<void> {
  try {
    await Promise.race([
      runApplyModelLogic(state, jobTitle),
      new Promise<void>((resolve) => setTimeout(() => resolve(), 60_000)),
    ]);
  } catch (error: unknown) {
    aaError('runApplyModel critical error', error);
  }
}

export async function runFindEasyApply(
  state: ContentRunState,
  jobTitle: string,
  companyName: string,
  listItem: HTMLElement | null = null,
): Promise<void> {
  try {
    await addDelay(1000);
    const saveModalHandled = await handleSaveApplicationModal(state);
    if (saveModalHandled) {
      aaLog('runFindEasyApply', 'save modal was handled - bailing', { jobTitle });
      return;
    }

    const baseJobId = listItem ? getJobIdFromItem(listItem) : null;
    const buildEntryUrl = (id: string | null) =>
      id ? `https://www.linkedin.com/jobs/view/${id}/` : '';

    const alreadyAppliedElement = document.querySelector('.artdeco-inline-feedback__message');
    if (alreadyAppliedElement) {
      const textContent = alreadyAppliedElement.textContent || '';
      const lower = textContent.toLowerCase();
      const isAlreadyApplied =
        lower.includes('applied') &&
        (lower.includes('ago') ||
          lower.includes('minutes') ||
          lower.includes('hours') ||
          lower.includes('days'));
      if (isAlreadyApplied) {
        aaLog('runFindEasyApply', 'already applied - skipping', { jobTitle });
        await recordApplyHistoryEntry({
          jobId: baseJobId,
          title: jobTitle,
          companyName,
          url: buildEntryUrl(baseJobId),
          applied: false,
          reason: 'alreadyApplied',
          description: 'Inline feedback indicates job was already applied to',
        });
        return;
      }
    }

    const currentPageLink = window.location.href;

    const easyApplyButton = getVisibleElementByXPath({ xpath: EASY_APPLY_BUTTON_XPATH });

    if (!easyApplyButton) {
      const externalApplyElements = getElementsByXPath({ xpath: NOT_EASY_APPLY_BUTTON_XPATH });
      aaLog('runFindEasyApply', 'no easy-apply button found', {
        jobTitle,
        externalApplyMatches: externalApplyElements.length,
      });

      if (externalApplyElements.length > 0) {
        await sendMessage('externalApplyAction', {
          jobTitle,
          currentPageLink,
          companyName,
        });
        await recordApplyHistoryEntry({
          jobId: baseJobId,
          title: jobTitle,
          companyName,
          url: buildEntryUrl(baseJobId),
          applied: false,
          reason: 'external',
          description: 'External apply — saved to External Apply list',
        });
      } else {
        const refetched = listItem ? findJobItemByJobId(getJobIdFromItem(listItem)) : null;
        const cardForCheck = refetched || listItem;
        if (cardForCheck && isItemAlreadyApplied(cardForCheck)) {
          aaLog(
            'runFindEasyApply',
            'no apply button + card shows Applied — recording alreadyApplied',
            { jobTitle },
          );
          const jobId = getJobIdFromItem(cardForCheck);
          await recordApplyHistoryEntry({
            jobId,
            title: jobTitle,
            companyName,
            url: buildEntryUrl(jobId),
            applied: false,
            reason: 'alreadyApplied',
            description:
              'No Apply control on the page and the card shows the "Applied" badge',
          });
        } else {
          const detailsPanel = document.querySelector(
            '.jobs-search__job-details, .jobs-details, [class*="jobs-details"]',
          );
          await recordApplyHistoryEntry({
            jobId: baseJobId,
            title: jobTitle,
            companyName,
            url: buildEntryUrl(baseJobId),
            applied: false,
            reason: 'noEasyApply',
            description: 'No Easy Apply control found on this job',
            debugHtml: captureDebugHtml(detailsPanel),
          });
        }
      }
      return;
    }

    {
      const refetched = listItem ? findJobItemByJobId(getJobIdFromItem(listItem)) : null;
      const cardForCheck = refetched || listItem;
      if (cardForCheck && isItemAlreadyApplied(cardForCheck)) {
        aaLog(
          'runFindEasyApply',
          'card shows Applied — skipping before clicking apply',
          { jobTitle },
        );
        const jobId = getJobIdFromItem(cardForCheck);
        await recordApplyHistoryEntry({
          jobId,
          title: jobTitle,
          companyName,
          url: buildEntryUrl(jobId),
          applied: false,
          reason: 'alreadyApplied',
          description:
            'Card shows the "Applied" badge (caught right before clicking Apply)',
        });
        return;
      }
    }

    const isSdui = (easyApplyButton.getAttribute('href') || '').includes('openSDUIApplyFlow');
    aaLog('runFindEasyApply', 'easy-apply button found', {
      jobTitle,
      tag: easyApplyButton.tagName,
      ariaLabel: (easyApplyButton.getAttribute('aria-label') || '').slice(0, 60),
      hasJobsApplyClass: (easyApplyButton.className || '').includes('jobs-apply-button'),
      hrefHasSDUI: isSdui,
    });

    const result = await state.checkAndPrepareRunState();
    if (!result) {
      aaWarn('runFindEasyApply', 'auto-apply paused before clicking');
      return;
    }

    state.resetApplyOutcome();

    easyApplyButton.click();
    await waitForJobsLoaderToDisappear();
    await addDelay(2000);

    await runApplyModel(state, jobTitle);
    await waitForLoaderToDisappear();

    await handleSaveApplicationModal(state);
    await addDelay(2000);

    const outcome = state.applyOutcome;
    if (outcome.submitClicked && outcome.sentModalDetected) {
      aaLog('runFindEasyApply', 'submission confirmed', { jobTitle });
      await recordApplyHistoryEntry({
        jobId: baseJobId,
        title: jobTitle,
        companyName,
        url: buildEntryUrl(baseJobId),
        applied: true,
      });
    } else if (outcome.submitClicked && !outcome.sentModalDetected) {
      aaWarn(
        'runFindEasyApply',
        'Submit was clicked but no "Your application was sent" modal — recording as not confirmed',
        { jobTitle },
      );
      await recordApplyHistoryEntry({
        jobId: baseJobId,
        title: jobTitle,
        companyName,
        url: buildEntryUrl(baseJobId),
        applied: false,
        reason: 'submitNotConfirmed',
        description:
          'Submit application was clicked but the "Your application was sent" success modal did not appear within 8s. Submission status is unknown.',
        debugHtml: captureDebugHtml(
          document.querySelector('.artdeco-modal, [role="dialog"]'),
        ),
      });
    } else if (outcome.reachedModal && !outcome.submitClicked) {
      aaWarn(
        'runFindEasyApply',
        'Apply modal opened but Submit button was never reached/clicked',
        { jobTitle },
      );
      await recordApplyHistoryEntry({
        jobId: baseJobId,
        title: jobTitle,
        companyName,
        url: buildEntryUrl(baseJobId),
        applied: false,
        reason: 'noSubmitButton',
        description:
          'The apply modal opened but the script never reached or never managed to click "Submit application" (form was likely incomplete or had a question we could not answer).',
        debugHtml: captureDebugHtml(
          document.querySelector('.artdeco-modal, [role="dialog"]'),
        ),
      });
    } else {
      aaWarn('runFindEasyApply', 'Apply modal never opened after clicking Apply', {
        jobTitle,
      });
      await recordApplyHistoryEntry({
        jobId: baseJobId,
        title: jobTitle,
        companyName,
        url: buildEntryUrl(baseJobId),
        applied: false,
        reason: 'noEasyApply',
        description: 'Clicked Apply control but the application modal never opened.',
        debugHtml: captureDebugHtml(
          document.querySelector(
            '.jobs-search__job-details, .jobs-details, [class*="jobs-details"]',
          ),
        ),
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    aaError('runFindEasyApply', 'unhandled error', message);
    try {
      const jobId = listItem ? getJobIdFromItem(listItem) : null;
      await recordApplyHistoryEntry({
        jobId,
        title: jobTitle,
        companyName,
        url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
        applied: false,
        reason: 'error',
        description: `runFindEasyApply exception: ${message}`,
        debugHtml: captureDebugHtml(
          listItem ??
            document.querySelector('.artdeco-modal, [role="dialog"]') ??
            document.querySelector(
              '.jobs-search__job-details, .jobs-details, [class*="jobs-details"]',
            ),
        ),
      });
    } catch {
      // ignore tracking errors
    }
  }
}

export async function goToNextPage(state: ContentRunState): Promise<boolean> {
  aaLog('goToNextPage: entering');
  await addDelay();
  if (state.isNavigating) {
    aaLog('goToNextPage: already navigating, bailing');
    return false;
  }

  state.isNavigating = true;

  try {
    await waitForJobsLoaderToDisappear();

    const isStillRunning = await state.checkAndPrepareRunState();
    if (!isStillRunning) {
      aaLog('goToNextPage: auto-apply not running, aborting');
      state.isNavigating = false;
      return false;
    }

    const pageInfo = getPaginationInfo();
    aaLog('goToNextPage: pagination state', {
      ui: pageInfo.ui,
      activePage: pageInfo.activePageText,
      hasNext: !!pageInfo.nextButton,
    });

    if (!pageInfo.nextButton) {
      aaLog('goToNextPage: no next button — last page reached, stopping script');
      state.isNavigating = false;
      void state.stopScript();
      return false;
    }

    pageInfo.nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await addDelay(1000);
    pageInfo.nextButton.click();

    await waitForJobItems(5000);
    await addDelay(1000);
    const scrollElement = getJobsListScrollContainer();
    if (scrollElement) {
      scrollElement.scrollTo({ top: scrollElement.scrollHeight });
    }

    await new Promise<void>((resolve) => {
      const checkPageLoaded = () => {
        if (document.readyState === 'complete') resolve();
        else setTimeout(checkPageLoaded, 500);
      };
      checkPageLoaded();
    });

    state.currentPage = pageInfo.activePageText;
    state.isNavigating = false;

    aaLog('goToNextPage: navigated, restarting runScript');
    await runScript(state);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    aaError('goToNextPage threw:', message, error);
    state.isNavigating = false;
    return false;
  }
}

export async function runScript(state: ContentRunState): Promise<void> {
  try {
    await addDelay(3000);
    if (!state.isExtensionContextValid()) {
      aaWarn('runScript', 'extension context invalid on entry');
      return;
    }

    const currentUrl = window.location.href;
    const ui = detectJobsUI();
    aaLog('runScript', 'starting', { url: currentUrl, ui, path: window.location.pathname });

    if (ui === AA_UI_UNKNOWN || !isJobsSearchPage()) {
      aaWarn('runScript: not a jobs search page or unknown UI - aborting', { ui });
      return;
    }

    if (
      (currentUrl.includes('/jobs/search/') || currentUrl.includes('/jobs/search-results/')) &&
      currentUrl.includes('keywords=')
    ) {
      await lastJobSearchUrlStorage.setValue(currentUrl);
    }

    const scriptStarted = await state.startScript();
    if (!scriptStarted) {
      aaWarn('runScript', 'startScript() returned false');
      return;
    }

    await fillSearchFieldIfEmpty(state);

    const isRunning = await state.checkAndPrepareRunState(true);
    if (!isRunning) {
      aaWarn('runScript', 'auto-apply not running after start');
      return;
    }
    if (!state.isExtensionContextValid()) return;

    await state.setAutoApplyRunning(true, 'runScript reactivation');
    const fieldsComplete = await checkAndPromptFields();
    if (!fieldsComplete) {
      aaWarn('runScript', 'default fields incomplete - opening config page');
      await sendMessage('openDefaultInputPage', undefined);
      return;
    }

    const limitReached = await checkLimitReached();
    if (limitReached) {
      aaWarn('runScript', 'daily application limit reached');
      await recordApplyHistoryEntry({
        jobId: null,
        title: '',
        companyName: '',
        url: '',
        applied: false,
        reason: 'limitReached',
        description: "LinkedIn's daily Easy Apply limit was reached",
      });
      const feedbackMessageElement = document.querySelector('.artdeco-inline-feedback__message');
      await toggleBlinkingBorder(
        feedbackMessageElement instanceof HTMLElement ? feedbackMessageElement : null,
      );
      return;
    }

    const [titleSkipEnabled, titleFilterEnabled, badWordsEnabled, titleFilterWords, titleSkipWords] =
      await Promise.all([
        titleSkipEnabledStorage.getValue(),
        titleFilterEnabledStorage.getValue(),
        badWordsEnabledStorage.getValue(),
        titleFilterWordsStorage.getValue(),
        titleSkipWordsStorage.getValue(),
      ]);

    let listItems = await waitForJobItems(8000);
    if (!listItems || listItems.length === 0) {
      aaError('runScript', 'no job items found on page', {
        ui,
        lazyColumns: document.querySelectorAll('[data-component-type="LazyColumn"]').length,
        dismissButtons: document.querySelectorAll('button[aria-label^="Dismiss "][aria-label$=" job"]').length,
        scaffoldItems: document.querySelectorAll('.scaffold-layout__list-item').length,
      });
      await state.stopScript();
      return;
    }
    aaLog('runScript', `processing ${listItems.length} job items (${ui} UI)`);

    for (let i = 0; i < listItems.length; i++) {
      let listItem = listItems[i];

      if (i % 5 === 0 && !state.isExtensionContextValid()) {
        aaWarn('runScript: extension context invalid mid-loop, exiting', { i });
        return;
      }

      const stillRunning = await state.checkAndPrepareRunState();
      if (!stillRunning) {
        aaLog('runScript: auto-apply paused at item', { i });
        return;
      }

      await addDelay(300);
      const stillRunning2 = await state.checkAndPrepareRunState();
      if (!stillRunning2) {
        aaLog('runScript: auto-apply paused at item (post-delay)', { i });
        return;
      }

      await closeApplicationSentModal(state);
      await handleSaveApplicationModal(state);
      await ensureNoApplicationModalOpen();

      const clickTarget = getJobItemClickTarget(listItem);
      if (!clickTarget) {
        aaWarn('iterate', `item #${i}: no click target`, { ui });
        const jobId = getJobIdFromItem(listItem);
        await recordApplyHistoryEntry({
          jobId,
          title: '',
          companyName: '',
          url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
          applied: false,
          reason: 'noClickTarget',
          description: `Item #${i} has no clickable element (UI: ${ui})`,
          debugHtml: captureDebugHtml(listItem),
        });
        continue;
      }

      clickTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await addDelay(700);

      const initialJobId = getJobIdFromItem(listItem);
      const freshItem = (initialJobId && findJobItemByJobId(initialJobId)) || listItem;
      if (freshItem !== listItem) listItem = freshItem;

      if (isItemAlreadyApplied(listItem)) {
        aaLog('iterate', `item #${i}: already applied - skipping`);
        const jobId = getJobIdFromItem(listItem);
        await recordApplyHistoryEntry({
          jobId,
          title: extractJobTitleFromItem(listItem),
          companyName: extractCompanyNameFromItem(listItem),
          url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
          applied: false,
          reason: 'alreadyApplied',
          description: 'Card already shows the "Applied" badge',
        });
        continue;
      }

      const jobTitle = extractJobTitleFromItem(listItem);
      const companyName = extractCompanyNameFromItem(listItem);

      if (!jobTitle) {
        aaWarn('iterate', `item #${i}: empty job title - skipping`);
        const jobId = getJobIdFromItem(listItem);
        await recordApplyHistoryEntry({
          jobId,
          title: '',
          companyName,
          url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
          applied: false,
          reason: 'noTitle',
          description: 'Could not extract job title from card',
        });
        continue;
      }
      aaLog('iterate', `item #${i}`, { jobTitle, companyName });

      if (titleSkipEnabled && titleSkipWords?.length > 0) {
        let matchedIn: 'jobTitle' | 'companyName' | null = null;
        const matchedSkipWord = titleSkipWords.find((word) => {
          if (matchesFilter(jobTitle, word)) {
            matchedIn = 'jobTitle';
            return true;
          }
          if (matchesFilter(companyName, word)) {
            matchedIn = 'companyName';
            return true;
          }
          return false;
        });
        if (matchedSkipWord) {
          aaLog('iterate', `item #${i}: matched titleSkipWord`, {
            matchedSkipWord,
            matchedIn,
          });
          const jobId = getJobIdFromItem(listItem);
          await recordApplyHistoryEntry({
            jobId,
            title: jobTitle,
            companyName,
            url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
            applied: false,
            reason: 'titleSkip',
            description: `Title Must Skip — matched "${matchedSkipWord}" in ${matchedIn}`,
          });
          continue;
        }
      }

      if (titleFilterEnabled && titleFilterWords?.length > 0) {
        const matchedFilterWord = titleFilterWords.find(
          (word) => matchesFilter(jobTitle, word) || matchesFilter(companyName, word),
        );
        if (!matchedFilterWord) {
          aaLog('iterate', `item #${i}: no titleFilterWord matched`);
          const jobId = getJobIdFromItem(listItem);
          await recordApplyHistoryEntry({
            jobId,
            title: jobTitle,
            companyName,
            url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
            applied: false,
            reason: 'titleFilterMissing',
            description: `Title Must Contain — none of the required words matched. Tried: ${titleFilterWords.join(', ')}`,
          });
          continue;
        }
      }

      const stillRunning3 = await state.checkAndPrepareRunState();
      if (!stillRunning3) return;

      try {
        await clickElement({ elementOrSelector: clickTarget });
        const stillRunning4 = await state.checkAndPrepareRunState();
        if (!stillRunning4) return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        aaError('iterate', `item #${i}: click failed`, message);
        const jobId = getJobIdFromItem(listItem);
        await recordApplyHistoryEntry({
          jobId,
          title: jobTitle,
          companyName,
          url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
          applied: false,
          reason: 'clickFailed',
          description: `Click on card threw: ${message}`,
          debugHtml: captureDebugHtml(listItem),
        });
        continue;
      }

      const expectedJobId = getJobIdFromItem(listItem);
      const detailsLoaded = await waitForJobDetailsLoaded(12_000, expectedJobId);
      if (!detailsLoaded) {
        aaWarn('iterate', `item #${i}: job details did not load - skipping`, {
          expectedJobId,
        });
        const jobId = expectedJobId;
        await recordApplyHistoryEntry({
          jobId,
          title: jobTitle,
          companyName,
          url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : '',
          applied: false,
          reason: 'detailsNotLoaded',
          description: `Right details panel did not render within 12s (expectedJobId: ${expectedJobId || 'unknown'})`,
          debugHtml: captureDebugHtml(listItem),
        });
        continue;
      }

      const stillRunning5 = await state.checkAndPrepareRunState();
      if (!stillRunning5) return;

      await clickJob(state, listItem, companyName, jobTitle, badWordsEnabled);
      await handleSaveApplicationModal(state);
      await waitForJobsLoaderToDisappearAndHandle();
    }

    aaLog(`runScript: finished iterating ${listItems.length} items on page; advancing to next page`);

    const finalRunCheck = await state.checkAndPrepareRunState();
    if (!finalRunCheck) {
      aaLog('runScript: auto-apply was paused after the last item — staying put');
      return;
    }
    await waitForJobsLoaderToDisappearAndHandle();
    const advanced = await goToNextPage(state);
    aaLog('runScript: goToNextPage finished', { advanced });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.trace('Error in runScript: ' + message + ' script stopped');
    try {
      await recordApplyHistoryEntry({
        jobId: null,
        title: '',
        companyName: '',
        url: '',
        applied: false,
        reason: 'error',
        description: `runScript exception: ${message}`,
      });
    } catch {
      // ignore tracking failures
    }
    await state.stopScript();
  }
}
