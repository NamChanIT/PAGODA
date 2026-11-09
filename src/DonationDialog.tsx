import { useEffect, useRef, useState } from 'react';

export function DonationDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const modal = dialog.current;
    modal?.showModal();
    return () => { modal?.close(); if (previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, []);
  return <dialog ref={dialog} className="settings-dialog donation-dialog" aria-labelledby="donation-title" onCancel={onClose}>
    <span className="eyebrow">CHÙA AN YÊN</span>
    <h2 id="donation-title">Hòm công đức</h2>
    <dl className="donation-account">
      <div><dt>Ngân hàng</dt><dd>Techcombank</dd></div>
      <div><dt>Chủ tài khoản</dt><dd>TRAN NHAT NAM</dd></div>
      <div><dt>Số tài khoản</dt><dd>6073 9999 999</dd></div>
    </dl>
    <p>Tùy tâm công đức. Quét mã bằng ứng dụng ngân hàng và kiểm tra tên người nhận trước khi chuyển khoản.</p>
    {unavailable ? <p role="status">Mã QR công đức chưa được cập nhật. Bạn hãy quay lại sau.</p> :
      <a href="/donation-qr.jpg" target="_blank" rel="noopener noreferrer" aria-label="Mở ảnh QR công đức kích thước đầy đủ">
        <img className="donation-qr" src="/donation-qr.jpg" alt="Mã QR Techcombank, TRAN NHAT NAM, số tài khoản 60739999999" onError={() => setUnavailable(true)}/>
        <span className="donation-image-link">Mở ảnh QR đầy đủ</span>
      </a>}
    <p>Trang này không tự xác nhận giao dịch. Bạn kiểm tra kết quả trong ứng dụng ngân hàng.</p>
    <div className="dialog-actions"><button autoFocus type="button" onClick={onClose}>Đóng</button></div>
  </dialog>;
}
