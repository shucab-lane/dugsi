import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SurahViewer from '../components/SurahViewer.jsx';

export default function TeacherSurah() {
  const { id, n } = useParams();
  const { user } = useAuth();
  return (
    <div>
      <Link to={`/students/${id}`} className="text-sm text-mosque hover:underline">
        ← Back to student
      </Link>
      <div className="mt-2" />
      <div className="card bg-amber-50 border-amber-200 text-amber-900 text-sm mb-4">
        <strong>Teacher mode:</strong> tap any ayah to mark or unmark it as a mistake.
        Red ayahs are open mistakes the student still has to fix.
      </div>
      <SurahViewer
        studentId={id}
        teacherId={user.id}
        surahNumber={Number(n)}
        readOnly={false}
      />
    </div>
  );
}
