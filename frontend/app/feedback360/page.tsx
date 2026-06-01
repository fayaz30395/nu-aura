// Duplicate route: canonical implementation lives at /performance/360-feedback.
// Use a server redirect so old links do not depend on client hydration.
import {redirect} from 'next/navigation';

export default function Feedback360RedirectPage() {
  redirect('/performance/360-feedback');
}
