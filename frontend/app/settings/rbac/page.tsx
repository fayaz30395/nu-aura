import {redirect} from 'next/navigation';

export default function SettingsRbacRedirectPage() {
  redirect('/admin/roles');
}
