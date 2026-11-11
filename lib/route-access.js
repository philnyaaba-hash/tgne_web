import { redirect } from 'next/navigation';
import { accessClassForUser, ACCESS_ADMIN, ACCESS_CLIENT, homeForAccessClass, LOGIN_PATH } from './roles.js';
import { currentUser } from './office-auth';

// Authoritative, database-backed route guards used by the /admin and /client
// layouts. The Edge middleware blocks anonymous requests earlier, but these
// guards are what actually enforces permissions on every render.

export async function requireAdminUser() {
  const user = await currentUser();
  if (!user) redirect(LOGIN_PATH);
  const accessClass = accessClassForUser(user);
  if (accessClass !== ACCESS_ADMIN) redirect(homeForAccessClass(accessClass));
  return user;
}

export async function requireClientUser() {
  const user = await currentUser();
  if (!user) redirect(LOGIN_PATH);
  const accessClass = accessClassForUser(user);
  if (accessClass !== ACCESS_CLIENT) redirect(homeForAccessClass(accessClass));
  return user;
}
