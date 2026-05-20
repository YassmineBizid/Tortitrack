export function Toasts({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type==="err"?"toast-err":t.type==="ok"?"toast-ok":""}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
