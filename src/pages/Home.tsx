import { useEffect, useState } from 'react'
import { SHOP } from '../../shared/menu'
import { api } from '../api'
import { Food, Logo } from '../components/Food'
import { Qr } from '../components/Qr'
import { Link } from '../router'

export default function Home() {
  const [demo, setDemo] = useState<{ table: number; token: string | null } | null>(null)
  useEffect(() => {
    api<{ table: number; token: string | null }>('/demo').then(setDemo, () => setDemo(null))
  }, [])
  const tableUrl = demo?.token ? `/t/${demo.token}` : null

  return (
    <div className="home">
      <header className="h-top wrap">
        <div className="cust-brand">
          <Logo className="logo" />
          <div>
            <b>{SHOP.name}</b>
            <span>ก๋วยเตี๋ยว & อาหารตามสั่ง</span>
          </div>
        </div>
        <nav className="h-nav" aria-label="เมนูหลัก">
          <Link to="/kitchen">จอครัว</Link>
          <Link to="/admin">หลังร้าน</Link>
        </nav>
      </header>

      <section className="h-hero">
        <div className="wrap h-hero-in">
          <div className="h-copy">
            <p className="eyebrow">ระบบเมนู QR สำหรับร้านอาหาร</p>
            <h1>
              สแกนที่โต๊ะ
              <br />
              <em>ออเดอร์เด้งเข้าครัวทันที</em>
            </h1>
            <p className="h-sub">
              ลูกค้าเลือกเมนูและสั่งเองจากมือถือ ไม่ต้องรอพนักงานจดออเดอร์ ครัวเห็นออเดอร์สด ๆ เจ้าของร้านกดของหมด แก้ราคา และปิดบิลได้เองจากหลังร้าน
            </p>
            <div className="h-cta">
              {tableUrl ? (
                <Link to={tableUrl} className="btn btn-gold btn-lg">
                  ลองสั่งเป็นลูกค้าโต๊ะ {demo?.table}
                </Link>
              ) : (
                <span className="btn btn-gold btn-lg is-wait">กำลังเตรียมโต๊ะตัวอย่าง…</span>
              )}
              <Link to="/kitchen" className="btn btn-ghost-light btn-lg">
                เปิดจอครัว
              </Link>
            </div>
            <p className="h-pw">
              จอครัว / หลังร้าน ใช้รหัสผ่าน <code>demo1234</code>
            </p>
          </div>
          <div className="h-scan">
            <div className="h-scan-card">
              {tableUrl ? <Qr value={location.origin + tableUrl} label={`QR โต๊ะ ${demo?.table}`} /> : <div className="qr-ph" />}
              <b>สแกนด้วยมือถือ</b>
              <span>แล้วเปิดจอครัวบนคอมไว้ จะเห็นออเดอร์เด้งแบบเรียลไทม์</span>
            </div>
            <Food art="soup" className="h-bowl a" />
            <Food art="thaitea" className="h-bowl b" />
          </div>
        </div>
      </section>

      <section className="wrap h-roles" aria-label="3 หน้าจอในระบบ">
        <article>
          <Food art="krapow" className="h-role-art" />
          <h2>ลูกค้า · มือถือ</h2>
          <ul>
            <li>สแกน QR ที่โต๊ะ ไม่ต้องลงแอป</li>
            <li>เลือกเส้น เนื้อ เพิ่มไข่ ใส่หมายเหตุได้</li>
            <li>เห็นสถานะอาหารสด: กำลังทำ → พร้อมเสิร์ฟ</li>
            <li>กดเรียกพนักงาน / เรียกเช็คบิล</li>
          </ul>
          {tableUrl && (
            <Link to={tableUrl} className="btn btn-primary">
              ลองเป็นลูกค้า
            </Link>
          )}
        </article>
        <article>
          <Food art="beef" className="h-role-art" />
          <h2>จอครัว · แท็บเล็ต</h2>
          <ul>
            <li>ออเดอร์ใหม่เด้งพร้อมเสียงแจ้งเตือน</li>
            <li>แตะเดียวเลื่อนสถานะ ลูกค้าเห็นทันที</li>
            <li>เตือนสีเมื่อออเดอร์รอนานเกิน 10 / 20 นาที</li>
            <li>หมายเหตุแพ้อาหารเด่นชัด ไม่พลาด</li>
          </ul>
          <Link to="/kitchen" className="btn btn-primary">
            เปิดจอครัว
          </Link>
        </article>
        <article>
          <Food art="friedrice" className="h-role-art" />
          <h2>หลังร้าน · เจ้าของ</h2>
          <ul>
            <li>ผังโต๊ะ ยอดค้างชำระ ปิดบิลรับเงิน</li>
            <li>กดของหมด แก้ราคา เพิ่มเมนูเองได้</li>
            <li>พิมพ์ QR ประจำโต๊ะ (สั่งแทนโต๊ะอื่นไม่ได้)</li>
            <li>ยอดขายวันนี้ เมนูขายดี</li>
          </ul>
          <Link to="/admin" className="btn btn-primary">
            เข้าหลังร้าน
          </Link>
        </article>
      </section>

      <section className="wrap h-try">
        <h2>ลองให้เห็นภาพใน 1 นาที</h2>
        <ol>
          <li>
            <b>เปิดจอครัว</b> บนคอม (รหัส demo1234) แล้วกด “เปิดเสียงแจ้งเตือน”
          </li>
          <li>
            <b>สแกน QR</b> ด้านบนด้วยมือถือ หรือเปิดหน้าลูกค้าในอีกแท็บ แล้วสั่งก๋วยเตี๋ยวสักชาม
          </li>
          <li>
            ดูออเดอร์เด้งในครัว กด <b>เริ่มทำ</b> → <b>พร้อมเสิร์ฟ</b> แล้วดูสถานะบนมือถือเปลี่ยนเอง
          </li>
          <li>
            ในหลังร้าน กด <b>ของหมด</b> ที่เมนูไหนก็ได้ เมนูบนมือถือจะเทาลงทันที
          </li>
        </ol>
      </section>

      <footer className="foot wrap">
        <div>
          <b>{SHOP.full}</b> · {SHOP.area} · โทร {SHOP.phone}
        </div>
        <p>ร้านนี้เป็นธุรกิจสมมติ สร้างเป็นผลงานตัวอย่างระบบสั่งอาหารผ่าน QR สำหรับร้านอาหาร คาเฟ่ และร้านเครื่องดื่ม</p>
      </footer>
    </div>
  )
}
