import { DefaultFieldsForm } from '@/components/page/DefaultFieldsForm';
import { DropdownConfigList } from '@/components/page/DropdownConfigList';
import { InputFieldConfigList } from '@/components/page/InputFieldConfigList';
import { PageLayout } from '@/components/page/PageLayout';
import { RadioButtonConfigList } from '@/components/page/RadioButtonConfigList';

export default function App() {
  return (
    <PageLayout
      title="Form Control"
      description="Personal info defaults plus the answers the script has learned from LinkedIn forms."
    >
      <DefaultFieldsForm />
      <div className="grid gap-4 lg:grid-cols-3">
        <InputFieldConfigList />
        <RadioButtonConfigList />
        <DropdownConfigList />
      </div>
    </PageLayout>
  );
}
