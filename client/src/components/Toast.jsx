import { useUI } from '../context/UIContext';

export default function Toast() {
  const { toast } = useUI();
  if (!toast) return null;
  return (
    <div className="fixed bottom-7 left-1/2 z-[60] flex -translate-x-1/2 animate-fadeUpFast items-center gap-2.5 rounded-xl bg-dark px-6 py-3.5 text-[13.5px] font-semibold text-appbg shadow-toast">
      <span className="text-gold">●</span>
      {toast}
    </div>
  );
}
