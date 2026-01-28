
import React, { useEffect, useState } from 'react';
import provider from '../../core/provider';
import { Question, QuestionType } from '../../core/types';
import { Plus, Trash2, Edit, Save, ArrowRight, X } from 'lucide-react';

const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [qContent, setQContent] = useState('');
  const [qType, setQType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [qPoints, setQPoints] = useState(10);
  
  // Dynamic fields
  const [options, setOptions] = useState<string[]>(['', '', '', '']); // For MC & Sorting
  const [mcCorrect, setMcCorrect] = useState(''); // For MC
  const [shortCorrect, setShortCorrect] = useState(''); // For Short Answer
  const [matchingPairs, setMatchingPairs] = useState<{key:string, value:string}[]>([{key:'', value:''}]); // For Matching

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const list = await provider.getQuestions();
    setQuestions(list);
  };

  const resetForm = () => {
    setQContent('');
    setQType(QuestionType.MULTIPLE_CHOICE);
    setQPoints(10);
    setOptions(['', '', '', '']);
    setMcCorrect('');
    setShortCorrect('');
    setMatchingPairs([{key:'', value:''}]);
    setEditingId(null);
  };

  const handleOpenModal = (q?: Question) => {
    if (q) {
      setEditingId(q.id);
      setQContent(q.content);
      setQType(q.type);
      setQPoints(q.points);
      
      const parsedOptions = q.optionsJson ? JSON.parse(q.optionsJson) : [];
      const parsedCorrect = q.correctAnswerJson ? JSON.parse(q.correctAnswerJson) : '';

      if (q.type === QuestionType.MULTIPLE_CHOICE) {
        setOptions(parsedOptions);
        setMcCorrect(parsedCorrect);
      } else if (q.type === QuestionType.SHORT_ANSWER) {
        setShortCorrect(parsedCorrect);
      } else if (q.type === QuestionType.SORTING) {
        setOptions(parsedOptions); // This is the Correct Order for sorting
      } else if (q.type === QuestionType.MATCHING) {
        setMatchingPairs(parsedOptions);
      }
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let optionsJson = '[]';
    let correctAnswerJson = '""';

    if (qType === QuestionType.MULTIPLE_CHOICE) {
       optionsJson = JSON.stringify(options.filter(o => o.trim() !== ''));
       correctAnswerJson = JSON.stringify(mcCorrect);
    } else if (qType === QuestionType.SHORT_ANSWER) {
       correctAnswerJson = JSON.stringify(shortCorrect);
    } else if (qType === QuestionType.SORTING) {
       // For sorting, we save the correct order as optionsJson and correctAnswerJson
       const cleanOpts = options.filter(o => o.trim() !== '');
       optionsJson = JSON.stringify(cleanOpts);
       correctAnswerJson = JSON.stringify(cleanOpts); 
    } else if (qType === QuestionType.MATCHING) {
       const cleanPairs = matchingPairs.filter(p => p.key.trim() && p.value.trim());
       optionsJson = JSON.stringify(cleanPairs);
       correctAnswerJson = '[]'; // Logic handled by checking pairs
    }

    const payload: Question = {
      id: editingId || crypto.randomUUID(),
      type: qType,
      content: qContent,
      points: qPoints,
      optionsJson,
      correctAnswerJson
    };

    if (editingId) {
      await provider.updateQuestion(payload);
    } else {
      await provider.addQuestion(payload);
    }
    setIsModalOpen(false);
    loadQuestions();
  };

  const handleRemove = async (id: string) => {
     if(window.confirm('Xóa câu hỏi này?')) {
       await provider.removeQuestion(id);
       loadQuestions();
     }
  };

  // UI Helpers
  const renderOptionInputs = () => {
     if (qType === QuestionType.MULTIPLE_CHOICE) {
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Các phương án (Tích chọn đáp án đúng)</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="mc_correct" 
                  checked={mcCorrect === opt && opt !== ''} 
                  onChange={() => setMcCorrect(opt)}
                />
                <input 
                  type="text" 
                  value={opt} 
                  onChange={e => {
                    const newOpts = [...options];
                    newOpts[idx] = e.target.value;
                    setOptions(newOpts);
                  }}
                  className="flex-1 border rounded px-2 py-1"
                  placeholder={`Phương án ${idx + 1}`}
                />
                <button type="button" onClick={() => setOptions(options.filter((_, i) => i !== idx))} className="text-red-500"><X size={16}/></button>
              </div>
            ))}
            <button type="button" onClick={() => setOptions([...options, ''])} className="text-sm text-blue-600">+ Thêm phương án</button>
          </div>
        );
     }
     if (qType === QuestionType.SORTING) {
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Nhập thứ tự ĐÚNG (Từ trên xuống dưới)</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-400 w-6">{idx + 1}.</span>
                <input 
                  type="text" 
                  value={opt} 
                  onChange={e => {
                    const newOpts = [...options];
                    newOpts[idx] = e.target.value;
                    setOptions(newOpts);
                  }}
                  className="flex-1 border rounded px-2 py-1"
                />
                <button type="button" onClick={() => setOptions(options.filter((_, i) => i !== idx))} className="text-red-500"><X size={16}/></button>
              </div>
            ))}
            <button type="button" onClick={() => setOptions([...options, ''])} className="text-sm text-blue-600">+ Thêm mục</button>
          </div>
        );
     }
     if (qType === QuestionType.SHORT_ANSWER) {
       return (
         <div>
            <label className="block text-sm font-medium">Đáp án đúng</label>
            <input type="text" value={shortCorrect} onChange={e => setShortCorrect(e.target.value)} className="w-full border rounded px-3 py-2 mt-1"/>
         </div>
       )
     }
     if (qType === QuestionType.MATCHING) {
       return (
         <div className="space-y-2">
           <label className="block text-sm font-medium">Các cặp ghép nối (Cột Trái - Cột Phải)</label>
           {matchingPairs.map((pair, idx) => (
             <div key={idx} className="flex items-center gap-2">
               <input 
                 type="text" value={pair.key} placeholder="Vế trái" 
                 onChange={e => {
                   const newPairs = [...matchingPairs];
                   newPairs[idx].key = e.target.value;
                   setMatchingPairs(newPairs);
                 }}
                 className="flex-1 border rounded px-2 py-1"
               />
               <ArrowRight size={16} className="text-gray-400"/>
               <input 
                 type="text" value={pair.value} placeholder="Vế phải" 
                 onChange={e => {
                   const newPairs = [...matchingPairs];
                   newPairs[idx].value = e.target.value;
                   setMatchingPairs(newPairs);
                 }}
                 className="flex-1 border rounded px-2 py-1"
               />
               <button type="button" onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))} className="text-red-500"><X size={16}/></button>
             </div>
           ))}
           <button type="button" onClick={() => setMatchingPairs([...matchingPairs, {key:'', value:''}])} className="text-sm text-blue-600">+ Thêm cặp</button>
         </div>
       )
     }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ngân Hàng Câu Hỏi</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={18} className="mr-2" /> Thêm câu hỏi
        </button>
      </div>

      <div className="grid gap-4">
         {questions.map(q => (
           <div key={q.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    q.type === QuestionType.MULTIPLE_CHOICE ? 'bg-blue-100 text-blue-700' :
                    q.type === QuestionType.SORTING ? 'bg-purple-100 text-purple-700' :
                    q.type === QuestionType.MATCHING ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>{q.type}</span>
                  <span className="text-xs text-gray-500 font-semibold">{q.points} điểm</span>
                </div>
                <p className="font-medium text-gray-800">{q.content}</p>
                {/* Preview answers slightly */}
                <p className="text-xs text-gray-400 mt-1 truncate max-w-lg">
                   {q.type === QuestionType.SHORT_ANSWER ? `Đáp án: ${JSON.parse(q.correctAnswerJson)}` : 
                    q.type === QuestionType.MATCHING ? `Gồm ${JSON.parse(q.optionsJson).length} cặp` : 
                    `Các lựa chọn: ${JSON.parse(q.optionsJson).join(', ')}`}
                </p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => handleOpenModal(q)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded"><Edit size={18} /></button>
                 <button onClick={() => handleRemove(q.id)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={18} /></button>
              </div>
           </div>
         ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <h2 className="text-xl font-bold mb-4">{editingId ? 'Sửa Câu Hỏi' : 'Thêm Câu Hỏi Mới'}</h2>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-1">Loại câu hỏi</label>
                     <select value={qType} onChange={e => setQType(e.target.value as QuestionType)} className="w-full border rounded px-3 py-2">
                        {Object.values(QuestionType).map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">Điểm thưởng (XP)</label>
                     <input type="number" value={qPoints} onChange={e => setQPoints(parseInt(e.target.value))} className="w-full border rounded px-3 py-2" />
                   </div>
                </div>
                
                <div>
                   <label className="block text-sm font-medium mb-1">Nội dung câu hỏi</label>
                   <textarea rows={2} value={qContent} onChange={e => setQContent(e.target.value)} className="w-full border rounded px-3 py-2" required />
                </div>

                <div className="border-t pt-4">
                   {renderOptionInputs()}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50">Hủy</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
