import { useEffect } from 'react'
import { SHOP } from '../shared/menu'
import { ToastProvider } from './components/Toast'
import Admin from './pages/Admin'
import Home from './pages/Home'
import Kitchen from './pages/Kitchen'
import Table from './pages/Table'
import { usePath } from './router'

export default function App() {
  const path = usePath()
  const token = path.startsWith('/t/') ? path.slice(3).split('/')[0] : null
  const area = token ? 'table' : path.startsWith('/kitchen') ? 'kitchen' : path.startsWith('/admin') ? 'admin' : 'home'

  useEffect(() => {
    document.title = {
      table: `เมนู · ${SHOP.name}`,
      kitchen: `จอครัว · ${SHOP.name}`,
      admin: `หลังร้าน · ${SHOP.name}`,
      home: `${SHOP.name} — สแกน QR สั่งอาหารที่โต๊ะ`,
    }[area]
  }, [area])

  return (
    <ToastProvider>
      <div className={`shell a-${area}`}>
        <div className="demo-strip" role="note">
          ระบบตัวอย่าง (ร้านสมมติ) — ไม่มีการชำระเงินจริง ข้อมูลรีเซ็ตอัตโนมัติ
        </div>
        {area === 'table' && <Table key={token} token={token!} />}
        {area === 'kitchen' && <Kitchen />}
        {area === 'admin' && <Admin path={path.replace(/\/$/, '')} />}
        {area === 'home' && <Home />}
      </div>
    </ToastProvider>
  )
}
