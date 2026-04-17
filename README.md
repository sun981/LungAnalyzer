# 🏥 LungCare AI Workstation (LungAnalyzer)

**LungCare AI Workstation** คือระบบช่วยเหลือนักรังสีแพทย์ในการวิเคราะห์ก้อนเนื้อในปอด (Lung Nodule Classification) จากภาพ CT Scan โดยใช้ขุมพลัง AI แบบคู่ขนาน (Dual-Engine) 

## 🌟 จุดเด่นของระบบ
*   **Dual-Engine AI:** เลือกประมวลผลได้ทั้งผ่าน Cloud (Gemini 3.1 Flash) เพื่อความฉลาดเชิงลึก หรือประมวลผลผ่าน Local AI ในพื้นที่ (HuggingFace) เพื่อความเป็นส่วนตัวสูงสุด (Privacy)
*   **Radiomics Analysis:** ระบบคำนวณค่าทางคณิตศาสตร์ของก้อนเนื้อให้อัตโนมัติ (Area, Circularity, Density, Heterogeneity)
*   **Clinical Interface:** หน้าออกแบบตามมาตรฐานสถานีงานแพทย์ (Medical Workstation) ใช้งานง่าย รองรับการวาด Mask และปรับแต่ง Contrast (Windowing)
*   **Edge Deployment:** รองรับการติดตั้งบนฮาร์ดแวร์ขนาดเล็กอย่าง Raspberry Pi 5 สำหรับใช้ในคลินิกหรือโรงพยาบาล

---

## 🛠 วิธีการติดตั้งและเริ่มใช้งาน (สำหรับเครื่องหลัก)

### 1. หน้าเว็บ (Frontend - Next.js)
```bash
# ติดตั้ง dependencies
npm install

# รันระบบหน้าเว็บ
npm run dev
```

### 2. ระบบ AI หลังบ้าน (Backend - Python)
ไปที่โฟลเดอร์ `python_backend` และทำตามคู่มือในนั้น:
*   [อ่านคู่มือการติดตั้ง Backend (ภาษาไทย)](./python_backend/README.md)

---

## 🏗 สถาปัตยกรรม (Architecture)
*   **Frontend:** Next.js 14, Tailwind CSS, Fabric.js (Canvas Handling)
*   **Cloud AI Proxy:** API Routes ใน Next.js เชื่อมต่อกับ Google Gemini API
*   **Local AI Service:** FastAPI (Python) รันโมเดล HuggingFace (PyTorch)

## 📦 การนำไปใช้งานจริง (Deployment)
ระบบนี้ถูกออกแบบมาเพื่อรันผ่าน **Docker** ได้ทั้งชุด เพื่อความง่ายในการติดตั้งในคอมพิวเตอร์ของโรงพยาบาล โดยไม่จำเป็นต้องติดตั้ง Python หรือ Node.js ลงในเครื่องโดยตรง

---

> [!IMPORTANT]
> **Disclaimer:** โปรแกรมนี้ถูกพัฒนาขึ้นเพื่อเป็นเครื่องมือช่วยวิเคราะห์เบื้องต้นและเพื่อการศึกษาเท่านั้น การวินิจฉัยทางการแพทย์ขั้นสุดท้ายต้องกระทำโดยแพทย์ผู้เชี่ยวชาญเสมอ
