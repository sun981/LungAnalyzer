# 🏥 LungCare AI Local Backend (Python)

ส่วนประมวลผล AI แบบ Local สำหรับวิเคราะห์ภาพมะเร็งปอด (Classification) โดยใช้โมเดลจาก HuggingFace (`ebmonser/lung-cancer-image-classification`) 

**สำหรับผู้เริ่มต้น:** แนะนำให้ใช้ **วิธีที่ 1 (Docker)** เพราะจะลดปัญหาเรื่องการติดตั้ง Library ต่างๆ ได้ดีที่สุดครับ

---

## สเปคเครื่องที่แนะนำ
*   **ระบบปฏิบัติการ:** Windows 10/11, macOS หรือ Raspberry Pi (64-bit)
*   **RAM:** อย่างน้อย 4GB (แนะนำ 8GB)
*   **พื้นที่ว่าง:** ประมาณ 2GB (สำหรับตัวโปรแกรมและโมเดล AI)

---

## วิธีที่ 1: รันด้วย Docker (แนะนำที่สุดสะดวกรวดเร็ว) 🚀

หากเครื่องคุณมี **Docker Desktop** ติดตั้งอยู่แล้ว สามารถเริ่มทำงานได้ทันที:

1.  เปิด Terminal หรือ Command Prompt ในโฟลเดอร์นี้
2.  **สร้างตัวรัน (Build):**
    ```bash
    docker build -t lungcare-backend .
    ```
3.  **สั่งรัน (Run):**
    ```bash
    docker run -d -p 8000:8000 --name lungcare-ai lungcare-backend
    ```
4.  เสร็จเรียบร้อย! Backend จะทำงานอยู่ที่ `http://localhost:8000`

---

## วิธีที่ 2: รันด้วย Python ปกติ (Manual) 🐍

ใช้ในกรณีที่คุณต้องการรันโดยตรงบนเครื่อง:

### 1. ติดตั้ง Python
ตรวจสอบว่าเครื่องของคุณมี **Python 3.10 ขึ้นไป**

### 2. สร้างสภาพแวดล้อมจำลอง (Virtual Environment)
เพื่อไม่ให้ Library ไปตีกับโปรแกรมอื่นในเครื่อง:
```bash
# สำหรับ Windows
python -m venv venv
venv\Scripts\activate

# สำหรับ macOS / Linux / Raspberry Pi
python3 -m venv venv
source venv/bin/activate
```

### 3. ติดตั้งโปรแกรมที่จำเป็น
```bash
pip install -r requirements.txt
```

### 4. เริ่มทำงาน
```bash
python main.py
```
*หมายเหตุ: ในครั้งแรกที่รัน โปรแกรมจะทำการดาวน์โหลดโมเดลจาก HuggingFace (ประมาณ 500MB) มาเก็บไว้ในเครื่องโดยอัตโนมัติครับ*

---

## การเชื่อมต่อกับหน้าเว็บ (Frontend)
เมื่อ Backend นี้ทำงานอยู่ที่พอร์ต **8000** หน้าเว็บ Next.js จะสามารถส่งรูปภาพมาวิเคราะห์ได้ทันทีผ่านเมนู **"Local AI"** ในหน้า Workstation ครับ

### วิธีเช็คว่าทำงานได้ไหม?
เปิด Browser ไปที่ `http://localhost:8000` หากขึ้นข้อความ Error ของ FastAPI (404 Not Found) หรือหน้าว่างๆ แสดงว่าระบบทำงานปกติแล้วครับ (เราใช้ยิง API อย่างเดียว ไม่มีหน้าเว็บแสดงผล)

---

> [!TIP]
> **สำหรับ Raspberry Pi 5:** แนะนำให้ใช้พัดลมระบายความร้อนขณะทำงาน เพราะการประมวลผล AI จะใช้พลังงาน CPU สูงครับ
