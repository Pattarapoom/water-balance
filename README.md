# HII Water Balance

เว็บรวมผลวิเคราะห์สมดุลน้ำลุ่มน้ำปิง ชี และมูล พร้อมสัญญาข้อมูลกลางสำหรับเพิ่มลุ่มน้ำใหม่ในอนาคต

## ความสามารถ

- หน้า Overview เปรียบเทียบสถานการณ์ทุกลุ่มน้ำ
- หน้ารายละเอียด `/forecast/ping`, `/forecast/chi`, `/forecast/mun`
- ดึงข้อมูลจากระบบต้นทางและใช้ข้อมูลสำรองล่าสุดเมื่อแหล่งข้อมูลไม่ตอบสนอง
- Unified API ที่ `/api/v1/basins` และ `/api/v1/basins/:basin`
- Basin Registry ที่ `lib/basins.ts` สำหรับเปิดใช้ลุ่มน้ำใหม่
- Adapter แปลงข้อมูลต้นทางเป็น schema กลางที่ `lib/water-data.ts`

## เริ่มใช้งาน

ต้องใช้ Node.js `>=22.13.0`

```bash
npm install
npm run dev
```

ตรวจ build สำหรับ deployment:

```bash
npm run build
npm test
```

## เพิ่มลุ่มน้ำใหม่

1. เพิ่มรายการใน `BASINS` ที่ `lib/basins.ts`
2. เพิ่ม adapter ใน `lib/water-data.ts` หากรูปแบบ API ต่างจาก adapter เดิม
3. กำหนด fallback ที่ผ่านการยืนยันจากเจ้าของข้อมูล
4. เพิ่มชุดทดสอบ route และ schema ก่อนเปิดใช้งาน
