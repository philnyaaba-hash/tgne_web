import LegacyApp from '../../components/LegacyApp';
import WorkspaceAssistant from '../../components/assistant/workspace-assistant';

export const metadata = {
  title: 'Workspace | TGNE Solutions',
  robots: { index: false, follow: false }
};

export default function Page() {
  return (
    <>
      <LegacyApp />
      <WorkspaceAssistant />
    </>
  );
}
