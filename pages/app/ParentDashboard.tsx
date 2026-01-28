import React, { useEffect, useState } from 'react';
import provider from '../../core/provider';
import { Announcement, Behavior, BehaviorType, Student } from '../../core/types';
import { Bell, Star, ThumbsUp, AlertTriangle, Pin } from 'lucide-react';

const ParentDashboard: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Mock: Assume logged in as parent of first student
      const students = await provider.getStudents();
      const currentStudent = students[0];
      setStudent(currentStudent);

      if (currentStudent) {
        // Fetch new announcements
        const anns = await provider.getAnnouncements(currentStudent.classId);
        setAnnouncements(anns.slice(0, 5)); // Top 5

        const behs = await provider.getStudentBehaviors(currentStudent.id);
        // Get last 5
        setBehaviors(behs.slice(0, 5));
      }
    };
    fetchData();
  }, []);

  if (!student) return <div>Đang tải thông tin...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4 border-indigo-500">
        <h1 className="text-2xl font-bold text-gray-800">Xin chào, Phụ huynh em {student.fullName}</h1>
        <p className="text-gray-500">Mã học sinh: {student.studentCode}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Announcements */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Bell className="mr-2 text-yellow-500" /> Thông báo mới nhất
          </h2>
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-gray-400">Không có thông báo mới.</p>
            ) : (
              announcements.map(ann => (
                <div key={ann.id} className={`border-b border-gray-100 pb-3 last:border-0 last:pb-0 ${ann.pinned ? 'bg-yellow-50 -mx-2 px-2 rounded' : ''}`}>
                  <div className="flex items-center gap-2">
                    {ann.pinned && <Pin size={12} className="text-yellow-600 fill-yellow-600" />}
                    <p className="font-semibold text-gray-800">{ann.title}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ann.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(ann.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Behavior */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Star className="mr-2 text-blue-500" /> Nhận xét gần đây
          </h2>
          <div className="space-y-4">
            {behaviors.length === 0 ? (
              <p className="text-gray-400">Chưa có nhận xét nào.</p>
            ) : (
              behaviors.map(beh => (
                <div key={beh.id} className="flex items-start bg-gray-50 p-3 rounded">
                   <div className={`mt-1 rounded-full p-1 mr-3 ${beh.type === BehaviorType.PRAISE ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                     {beh.type === BehaviorType.PRAISE ? <ThumbsUp size={14} /> : <AlertTriangle size={14} />}
                   </div>
                  <div>
                    <span className="text-sm font-semibold block">{beh.type}</span>
                    <span className="text-sm text-gray-600">{beh.content}</span>
                    <span className="text-xs text-gray-400 block mt-1">{new Date(beh.date).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;