import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SurahViewer from '../components/SurahViewer.jsx';

export default function StudentSurah() {
  const { n } = useParams();
  const { user, profile } = useAuth();
  return (
    <div>
      <Link to="/" className="text-sm text-mosque hover:underline">← Back to dashboard</Link>
      <div className="mt-2" />
      <SurahViewer
        studentId={user.id}
        teacherId={profile?.teacher_id}
        surahNumber={Number(n)}
        readOnly
      />
    </div>
  );
}
