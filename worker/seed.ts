// Demo menu and tables. Server-only: table tokens must never ship in the client bundle.
import type { Art } from '../shared/menu'

export const CATEGORIES: [id: number, name: string][] = [
  [1, 'ก๋วยเตี๋ยว'],
  [2, 'อาหารจานเดียว'],
  [3, 'ของทานเล่น'],
  [4, 'เครื่องดื่ม'],
  [5, 'ของหวาน'],
]

type SeedItem = [category: number, name: string, desc: string, price: number, art: Art, presets: string[]]

export const ITEMS: SeedItem[] = [
  [1, 'ก๋วยเตี๋ยวหมูน้ำตก', 'น้ำซุปเข้มข้น เครื่องในหมู ลูกชิ้น ผักบุ้ง', 60, 'soup', ['noodle', 'size']],
  [1, 'ก๋วยเตี๋ยวต้มยำหมู', 'ต้มยำน้ำข้น ถั่วบด มะนาวสด', 60, 'tomyum', ['noodle', 'size', 'spicy']],
  [1, 'เย็นตาโฟทะเล', 'น้ำแดงหวานอมเปรี้ยว ปลาหมึก กุ้ง เต้าหู้ทอด', 70, 'pink', ['noodle', 'size']],
  [1, 'ก๋วยเตี๋ยวเนื้อตุ๋น', 'เนื้อตุ๋นนุ่ม ตุ๋นเครื่องยาจีน 6 ชั่วโมง', 80, 'beef', ['noodle', 'soup', 'size']],
  [1, 'บะหมี่เกี๊ยวหมูแดง', 'เกี๊ยวกุ้งห่อสด หมูแดงย่างเตาถ่าน', 65, 'dry', ['soup', 'size']],
  [2, 'กะเพราไข่ดาว', 'ผัดกะเพราใบสด พริกขี้หนูสวน', 60, 'krapow', ['meat', 'egg', 'spicy']],
  [2, 'ข้าวผัด', 'ข้าวหอมมะลิ ผัดไฟแรง หอมกลิ่นกระทะ', 55, 'friedrice', ['meat', 'egg']],
  [2, 'ผัดซีอิ๊ว', 'เส้นใหญ่ผัดซีอิ๊วดำ คะน้ากรอบ', 60, 'padsew', ['meat', 'egg']],
  [2, 'ราดหน้า', 'น้ำราดหน้าเต้าเจี้ยว ยอดผักคะน้า', 60, 'radna', ['meat']],
  [2, 'ข้าวหมูกระเทียม', 'หมูหมักผัดกระเทียมเจียวหอม ๆ', 55, 'garlic', ['egg']],
  [3, 'ลูกชิ้นทอด', 'ลูกชิ้นหมู/เอ็นทอด จิ้มน้ำจิ้มรสเด็ด', 40, 'balls', []],
  [3, 'เกี๊ยวทอด', '10 ชิ้น ไส้หมูกุ้ง กรอบนาน', 45, 'wonton', []],
  [3, 'ไข่เจียวหมูสับ', 'ฟูกรอบ ทอดน้ำมันใหม่ทุกจาน', 50, 'omelet', []],
  [3, 'หมูทอดกระเทียม', 'กับข้าวทานกับข้าวสวย', 80, 'porkfried', []],
  [4, 'ชาไทย', 'ชาไทยแท้ ใส่นมข้นหวาน', 35, 'thaitea', ['drink', 'sweet']],
  [4, 'ชาเขียวนม', 'ชาเขียวมัทฉะ หอมมัน', 40, 'greentea', ['drink', 'sweet']],
  [4, 'โอเลี้ยง', 'กาแฟโบราณ ชงแบบถุงผ้า', 30, 'oliang', ['sweet']],
  [4, 'น้ำอัดลม', 'โค้ก / สไปรท์ / แฟนต้า', 20, 'soda', []],
  [4, 'น้ำเปล่า', 'ขวดเล็ก', 10, 'water', []],
  [5, 'บัวลอยไข่หวาน', 'บัวลอยสามสี กะทิอบควันเทียน', 35, 'bualoy', []],
  [5, 'ทับทิมกรอบ', 'ใส่น้ำแข็งไส น้ำกะทิสด', 40, 'tubtim', []],
]

/** stable across nightly resets so printed QR codes keep working */
export const TABLE_TOKENS = [
  'q7m2xk9a', 'h4tz8wpe', 'c9vb3nqr', 'w2fk7yds', 'n8gp4mta', 'r3xj6uwc',
  'k5dq9ebz', 'p6yt2hvn', 'e8sw5rkg', 'z4mc7qfu', 'u9hn3jxb', 'b2ra8tvk',
]

/** the table the public demo links to */
export const DEMO_TABLE = 5
