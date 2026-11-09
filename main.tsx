import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { Users, Volume2, VolumeX, RotateCcw, Settings, Share2, Maximize, Minimize, Footprints, Hand, CircleDot, Armchair, Bell, Flame, Grid2X2 } from 'lucide-react';
import { World } from './world/World';
import { DonationDialog } from './DonationDialog';
import { useRoom } from './world/network';
import { useAmbientAudio } from './world/assets';
import { seats, layout } from './world/types';
import type { Ritual, Seat } from './world/types';
import { useMeditation } from './hooks/useMeditation';
import './style.css';

const read = (key: string, fallback: string) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const save = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Browser storage is optional. */ } };
const roomFromURL = () => { const room = new URLSearchParams(location.search).get('room'); return room && /^[a-z0-9-]{1,24}$/.test(room) ? room : 'an-yen'; };
class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="fallback"><h1>Chưa thể mở không gian 3D</h1><p>Hãy bật tăng tốc đồ họa hoặc thử trình duyệt khác.</p><button onClick={() => location.reload()}>Tải lại trang</button></div> : this.props.children;
  }
}
const actions = [
  { value: 'bow', Icon: Hand, label: 'Chắp tay · Lạy' },
  { value: 'sit', Icon: Armchair, label: 'Ngồi thiền' },
  { value: 'beads', Icon: CircleDot, label: 'Tràng hạt' },
  { value: 'stand', Icon: Footprints, label: 'Đứng dậy' },
] as const;

function Entrance() {
  const [enteredName, setEnteredName] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => read('chua3d.displayName', '').trim().slice(0, 24));
  const [error, setError] = useState('');
  if (enteredName !== null) return <App initialName={enteredName}/>;
  return <main className="entrance">
    <section className="settings-dialog entrance-card" aria-labelledby="entrance-title">
      <form onSubmit={event => {
        event.preventDefault();
        const nextName = draft.trim();
        if (!nextName) { setError('Bạn hãy nhập tên trước khi vào chùa.'); return; }
        save('chua3d.displayName', nextName); setEnteredName(nextName);
      }}>
        <span className="eyebrow">CHÙA AN YÊN</span>
        <h1 id="entrance-title">Chào bạn đến với An Yên</h1>
        <p>Hãy đặt tên để mọi người trong phòng nhận ra bạn.</p>
        <label htmlFor="entrance-name">Tên hiển thị</label>
        <input id="entrance-name" name="name" autoFocus required maxLength={24} autoComplete="nickname"
          placeholder="Nhập tên của bạn" value={draft} aria-invalid={!!error} aria-describedby="entrance-help"
          onChange={event => { setDraft(event.target.value); setError(''); }}/>
        <p id="entrance-help" role={error ? 'alert' : undefined}>{error || 'Tối đa 24 ký tự. Tên sẽ hiển thị với người cùng phòng.'}</p>
        <div className="dialog-actions"><button type="submit">Vào chùa</button></div>
      </form>
    </section>
  </main>;
}

function App({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [room, setRoom] = useState(roomFromURL);
  const [ritual, setRitual] = useState<Ritual>('stand');
  const [direction, setDirection] = useState('');
  const [angle, setAngle] = useState(0); const [zoom, setZoom] = useState(layout.camera.zoom);
  const [seat, setSeat] = useState<Seat | null>(null);
  const [settings, setSettings] = useState(false); const [people, setPeople] = useState(false);
  const [donation, setDonation] = useState(false);
  const openDonation = () => { setDirection(''); setDonation(true); };
  const [audio, setAudio] = useState(false);
  const [showSeats, setShowSeats] = useState(false);
  const [bellBusy, setBellBusy] = useState(false);
  const [incenseBusy, setIncenseBusy] = useState(false);
  const [quality, setQuality] = useState(() => read('chua3d.quality', 'balanced'));
  const [notice, setNotice] = useState('Chào bạn. Chọn một đệm để đến ngồi, hoặc dùng WASD để dạo bước.');
  const [fullscreen, setFullscreen] = useState(false);
  const [seatBusy, setSeatBusy] = useState(false);
  const seatRequest = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null); const settingsButton = useRef<HTMLButtonElement>(null);
  const shell = useRef<HTMLElement>(null);
  const drag = useRef<{ id: number; x: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const network = useRoom(name, room); const sound = useAmbientAudio();
  const notify = (text: string) => {
    clearTimeout(timer.current); setNotice(text); timer.current = setTimeout(() => setNotice(''), 5000);
  };
  const meditation = useMeditation(() => { sound.playChime(); notify('Đã hoàn thành thời thiền. Cảm ơn bạn đã dành thời gian cho mình.'); });
  const releaseSeat = () => {
    seatRequest.current++; setSeatBusy(false); setSeat(null);
    if (seatBusy || network.seatId.current !== null) void network.reserve(null).catch(() => notify('Chưa thể trả đệm. Hệ thống sẽ trả chỗ khi phiên kết thúc.'));
  };
  const chooseSeat = async (chosen: Seat) => {
    if (seatBusy) return;
    const requestId = ++seatRequest.current; setSeatBusy(true);
    try {
      if (await network.reserve(chosen.id) && requestId === seatRequest.current) {
        meditation.stop(); setSeat(chosen); setRitual('stand'); setShowSeats(false);
        notify(`Đang đến đệm ${chosen.id + 1}. Dùng phím di chuyển để hủy.`);
      }
    } catch { if (requestId === seatRequest.current) notify('Đệm này vừa có người chọn hoặc kết nối bị gián đoạn. Hãy chọn lại.'); }
    finally { if (requestId === seatRequest.current) setSeatBusy(false); }
  };
  const act = (value: Ritual) => {
    meditation.stop();
    if (value === 'stand') releaseSeat();
    setRitual(value); sound.playChime();
    notify(value === 'stand' ? 'Bạn đã đứng dậy' : 'Một hơi thở chậm, một khoảnh khắc an yên.');
  };
  useEffect(() => {
    if (settings) { setDirection(''); dialog.current?.showModal(); }
    else if (dialog.current?.open) { dialog.current.close(); settingsButton.current?.focus(); }
  }, [settings]);
  useEffect(() => {
    timer.current = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    const clear = () => { setDirection(''); drag.current = null; };
    const full = () => setFullscreen(!!document.fullscreenElement);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear); document.addEventListener('fullscreenchange', full);
    return () => { window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); document.removeEventListener('fullscreenchange', full); };
  }, []);
  useEffect(() => {
    if (!network.bell) return;
    if (audio) sound.playChime();
    notify(`${network.bell.by} vừa thỉnh chuông. Cùng lắng lại một nhịp.`);
  }, [network.bell]);
  const ringBell = async () => {
    if (bellBusy) return;
    sound.unlockAudio(); setBellBusy(true);
    try { await network.ringBell(); if (!audio) sound.playChime(); }
    catch { notify('Chuông vừa được thỉnh hoặc kết nối bị gián đoạn. Hãy chờ một nhịp rồi thử lại.'); }
    finally { setBellBusy(false); }
  };
  const toggleIncense = async () => {
    if (incenseBusy) return;
    setIncenseBusy(true);
    try { await network.changeIncense(!network.incense); }
    catch { notify('Chưa thể thay đổi hương. Hãy thử lại khi kết nối ổn định.'); }
    finally { setIncenseBusy(false); }
  };
  const resetCamera = () => { setAngle(0); setZoom(layout.camera.zoom); };
  const share = async () => {
    const url = new URL(location.href); url.searchParams.set('room', room);
    try { await navigator.clipboard.writeText(url.href); notify('Đã sao chép liên kết phòng. Người nhận cần truy cập được máy chủ của bạn.'); }
    catch { setSettings(true); notify('Liên kết phòng nằm trong phần cài đặt. Chạm vào ô liên kết để chọn rồi sao chép.'); }
  };
  const visiblePlayers = network.players.length ? network.players : [{ id: 'local', name, seatId: null }];
  return <main className="temple-app" ref={shell}>
    <div className="world-viewport"
      onPointerDown={event => { if (event.target instanceof HTMLCanvasElement) drag.current = { id: event.pointerId, x: event.clientX }; }}
      onPointerMove={event => {
        if (!drag.current || drag.current.id !== event.pointerId) return;
        const movement = event.clientX - drag.current.x;
        drag.current.x = event.clientX;
        setAngle(value => value - movement * .006);
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}
      onWheel={event => setZoom(value => Math.max(3, Math.min(8, value + event.deltaY * .004)))}>
      <Boundary><Canvas shadows={quality !== 'low'} dpr={quality === 'low' ? 1 : [1, 1.5]}
        camera={{ position: [0, 3.58, 17], fov: 66 }} fallback={<div className="fallback">Trình duyệt cần hỗ trợ WebGL.</div>}>
        <World incense={network.incense} onBell={ringBell} onIncense={toggleIncense} onDonation={openDonation} name={name} ritual={ritual} setRitual={setRitual} peers={network.players} self={network.self.current}
          latest={network.latest} correction={network.correction} direction={direction}
          paused={settings || donation || meditation.active} cameraAngle={angle} zoom={zoom} seat={seat}
          onSeat={chooseSeat} onRelease={releaseSeat}/>
      </Canvas></Boundary>
    </div>
    <header className="hall-header">
      <div className="glass location"><span className="temple-icon">⌂</span><strong>Chùa An Yên</strong><span className="divider"/><span>Chính điện</span><span className="room-name">{room}</span></div>
      <div className="glass utilities">
        <button aria-label="Người trong phòng" aria-expanded={people} onClick={() => { setPeople(!people); setShowSeats(false); }}><Users size={18}/><span>{network.connected ? network.players.length : 1}</span></button>
        <button aria-label={audio ? 'Tắt âm nền' : 'Bật âm nền'} aria-pressed={audio} onClick={() => {
          if (audio) sound.stopAmbient(); else sound.startAmbient(); setAudio(!audio);
        }}>{audio ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button>
        <button aria-label="Đặt lại camera" onClick={resetCamera}><RotateCcw size={19}/></button>
        <button aria-label="Sao chép liên kết phòng" onClick={share}><Share2 size={18}/></button>
        <button className="fullscreen-button" aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onClick={async () => {
          try { if (document.fullscreenElement) await document.exitFullscreen(); else await shell.current?.requestFullscreen(); }
          catch { notify('Trình duyệt này chưa hỗ trợ toàn màn hình.'); }
        }}>{fullscreen ? <Minimize size={18}/> : <Maximize size={18}/>}</button>
        <button ref={settingsButton} aria-label="Hồ sơ và phòng" onClick={() => setSettings(true)}><Settings size={19}/></button>
      </div>
    </header>
    <div className="connection" role="status"><i className={network.connected ? 'online' : ''}/>{network.status}</div>
    {people && <section className="people-panel glass" aria-label="Người trong phòng">
      <div><strong>Cùng hiện diện</strong><button aria-label="Đóng danh sách" onClick={() => setPeople(false)}>×</button></div>
      <ul>{visiblePlayers.map(p => <li key={p.id}><span className="person-avatar">{p.name.charAt(0)}</span><span>{p.name}</span><small>{typeof p.seatId === 'number' ? `Đệm ${p.seatId + 1}` : 'Dạo bước'}</small></li>)}</ul>
    </section>}
    {showSeats && <section className="seats-panel glass" aria-label="Chọn đệm ngồi">
      <div className="panel-heading"><strong>Chọn chỗ tĩnh tâm</strong><button aria-label="Đóng bảng đệm" onClick={() => setShowSeats(false)}>×</button></div>
      <p>Phía trên là hướng bàn thờ. Chọn một đệm để tự đi đến ngồi.</p>
      <div className="seat-grid">{seats.map(chosen => {
        const owner = network.players.find(p => p.seatId === chosen.id && p.id !== network.self.current);
        const selected = seat?.id === chosen.id;
        return <button key={chosen.id} aria-label={`Đệm ${chosen.id + 1}${owner ? ` · ${owner.name} đang giữ` : ''}`} aria-pressed={selected}
          disabled={!!owner || seatBusy || meditation.active} onClick={() => chooseSeat(chosen)}>
          <Armchair size={19}/><span>{chosen.id + 1}</span><small>{owner ? 'Có người' : selected ? 'Của bạn' : 'Còn trống'}</small>
        </button>;
      })}</div>
      <small>{seatBusy ? 'Đang giữ chỗ…' : 'Đệm đã có người giữ sẽ không thể chọn.'}</small>
    </section>}
    {notice && <div className="hall-notice glass" role="status">{notice}</div>}
    <aside className="hall-guide"><span>KHÔNG GIAN TĨNH TÂM</span><h1>Trở về với<br/>bình yên.</h1><p>Chọn một đệm để ngồi xuống.<br/>W A S D / ↑ ↓ ← → để di chuyển.<br/>Kéo để xoay · Cuộn để thu phóng.</p></aside>
    <div className="temple-tools glass" aria-label="Tương tác chính điện">
      <button aria-label="Mở hòm công đức" onClick={openDonation}><Hand size={17}/><span>Công đức</span></button>
      <button aria-label="Chọn đệm ngồi" aria-expanded={showSeats} onClick={() => { setShowSeats(!showSeats); setPeople(false); }}><Grid2X2 size={17}/><span>Chọn đệm</span></button>
      <button aria-label="Thỉnh chuông" disabled={bellBusy} onClick={ringBell}><Bell size={17}/><span>Thỉnh chuông</span></button>
      <button aria-label={network.incense ? 'Tắt hương' : 'Thắp hương'} aria-pressed={network.incense} disabled={incenseBusy} onClick={toggleIncense}><Flame size={17}/><span>{network.incense ? 'Hương đang cháy' : 'Thắp hương'}</span></button>
    </div>
    <section className="meditation-card glass" aria-label="Thời thiền">
      {meditation.active ? <>
        <span className="eyebrow">{meditation.running ? 'HÍT VÀO NHẸ · THỞ RA CHẬM' : 'ĐANG TẠM DỪNG'}</span>
        <strong className="meditation-time" role="timer">{Math.floor(meditation.remaining / 60)}:{String(meditation.remaining % 60).padStart(2, '0')}</strong>
        <div className="meditation-actions"><button onClick={() => meditation.running ? meditation.pause() : meditation.resume()}>{meditation.running ? 'Tạm dừng' : 'Tiếp tục'}</button><button onClick={meditation.stop}>Kết thúc</button></div>
      </> : <>
        <span className="eyebrow">DÀNH THỜI GIAN CHO MÌNH</span><strong>Một thời thiền nhỏ</strong>
        <div className="meditation-actions">{[1, 3, 5].map(minutes => <button key={minutes} onClick={() => { setDirection(''); setRitual('sit'); meditation.start(minutes * 60); }}>{minutes} phút</button>)}</div>
        <small>{meditation.history.length ? `${meditation.history.length} thời thiền đã hoàn thành trên thiết bị này` : 'Chọn thời lượng để bắt đầu'}</small>
      </>}
    </section>
    <div className="movement-pad" aria-label="Điều khiển di chuyển">{['w','a','s','d'].map((key, i) => <button key={key} disabled={settings || donation || meditation.active}
      aria-label={['Đi tới','Sang trái','Đi lùi','Sang phải'][i]}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setDirection(key); }}
      onPointerUp={() => setDirection('')} onPointerCancel={() => setDirection('')} onLostPointerCapture={() => setDirection('')}>{['↑','←','↓','→'][i]}</button>)}</div>
    <nav className="ritual-dock glass" aria-label="Lễ nghi">{actions.map(({ value, Icon, label }) => <button key={value} aria-label={label} aria-pressed={ritual === value} onClick={() => act(value)}><Icon size={23}/>{label}</button>)}</nav>
    <footer className="hall-footer">AN YÊN <span>·</span> Cùng hiện diện, cùng lắng lại</footer>
    {donation && <DonationDialog onClose={() => setDonation(false)}/>}
    <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title" onCancel={() => setSettings(false)}>
      {settings && <form onSubmit={event => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        const nextName = String(data.get('name')).trim(); const nextRoom = String(data.get('room')).trim();
        if (!nextName || !/^[a-z0-9-]{1,24}$/.test(nextRoom)) return;
        if (nextName !== name || nextRoom !== room) { releaseSeat(); meditation.stop(); setRitual('stand'); }
        setName(nextName); setRoom(nextRoom); save('chua3d.displayName', nextName);
        const nextQuality = String(data.get('quality')); setQuality(nextQuality); save('chua3d.quality', nextQuality);
        const url = new URL(location.href); url.searchParams.set('room', nextRoom); history.replaceState(null, '', url);
        setSettings(false);
      }}>
        <span className="eyebrow">CHÙA AN YÊN</span><h2 id="settings-title">Hồ sơ & phòng</h2>
        <p>Vào cùng mã phòng để gặp nhau. Mỗi phòng có tối đa 24 người.</p>
        <label>Tên hiển thị<input autoFocus name="name" required maxLength={24} defaultValue={name}/></label>
        <label>Mã phòng<input name="room" required pattern="[a-z0-9-]{1,24}" maxLength={24} defaultValue={room}/></label>
        <small>Dùng chữ thường không dấu, số và dấu gạch ngang.</small>
        <label>Liên kết phòng hiện tại<input readOnly aria-label="Liên kết phòng hiện tại" value={`${location.origin}/?room=${encodeURIComponent(room)}`} onFocus={event => event.currentTarget.select()} onClick={event => event.currentTarget.select()}/></label>
        <small>Gửi liên kết này cho người cùng Wi-Fi. Lưu thay đổi mã phòng trước khi sao chép.</small>
        <label>Chất lượng hình ảnh<select name="quality" defaultValue={quality}><option value="balanced">Cân bằng · Có bóng đổ</option><option value="low">Nhẹ · Cho máy yếu</option></select></label>
        <div className="dialog-actions"><button type="button" onClick={() => setSettings(false)}>Đóng</button><button type="submit">Lưu & vào phòng</button></div>
      </form>}
    </dialog>
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Entrance/></React.StrictMode>);
