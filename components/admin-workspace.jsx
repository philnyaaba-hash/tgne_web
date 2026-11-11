import LegacyApp from './LegacyApp';
import WorkspaceAssistant from './assistant/workspace-assistant';
import WorkspaceLogoutButton from './workspace-logout-button';

export default function AdminWorkspace() {
  return (
    <>
      <WorkspaceLogoutButton />
      <LegacyApp />
      <WorkspaceAssistant />
    </>
  );
}
