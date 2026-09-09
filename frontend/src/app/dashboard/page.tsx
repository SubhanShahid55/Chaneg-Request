import { AppProvider } from '@/lib/store';
import { DashboardContent } from '@/app/page';

export default function DashboardPage() {
  return <AppProvider><DashboardContent /></AppProvider>;
}