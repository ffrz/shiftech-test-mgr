# Testify Vision

Testify adalah Simple QA &amp; Test Management Platform — open source, cloud atau
self-hosted, dibangun untuk modern testing. Menggantikan workflow berbasis Excel
dengan solusi modern yang sederhana, fleksibel, dan dapat berkembang sesuai
kebutuhan pengguna.

Filosofi utama Testify adalah **Human-first, AI-accelerated**: manual testing
menjadi fondasi utama, kemudian automation dan AI digunakan untuk mengurangi
pekerjaan yang repetitif, bukan menggantikan keputusan manusia.

## Tujuan Utama

- Menggabungkan Test Management, Issue Tracking, dan QA Collaboration dalam satu
  aplikasi yang terintegrasi
- Memungkinkan transisi bertahap dari manual testing → automation → AI-assisted
  testing tanpa mengubah workflow pengguna
- Menjadi platform yang mudah digunakan oleh individu, tim kecil, maupun
  perusahaan

## Prinsip Arsitektur

- Open Source (MIT License)
- Modular dan mudah dikembangkan oleh komunitas
- Deployment-agnostic (tidak bergantung pada satu platform atau penyedia cloud)
- Business logic terpisah dari database, authentication, dan deployment
- Seluruh akses data melalui abstraction layer (Repository + Adapter)
- AI, MCP, dan Automation merupakan fitur tambahan, bukan fondasi aplikasi

## Mode Deployment

Satu codebase yang dapat dijalankan dalam berbagai mode:

| Mode                | Teknologi       | Kebutuhan                        |
| ------------------- | --------------- | -------------------------------- |
| Standalone          | SQLite          | Tanpa server, cocok untuk individu atau menggantikan Excel |
| Self Hosted         | VPS, PostgreSQL | Kolaborasi tim, konfigurasi signup fleksibel |
| Shared Hosting      | —               | Instalasi sederhana, cocok untuk UKM dan organisasi kecil |
| Container / Cloud   | Docker/Kubernetes | Skalabilitas tinggi, siap dijadikan layanan SaaS |

## Fleksibilitas Autentikasi

Administrator bebas menentukan mekanisme akses:

- Local account
- Google OAuth
- OIDC / SSO
- Admin approval
- Auto signup
- Invite only

Semua dipilih melalui konfigurasi tanpa mengubah business logic.

## Target Pengguna

- Individual Tester
- Software Developer
- QA Engineer
- Startup
- Software House
- Enterprise
- Open Source Project

## Roadmap

```
Evolusi Excel
  ↓ Manual Test Management
  ↓ Issue Tracking
  ↓ QA Collaboration
  ↓ Automation
  ↓ AI Assistant
  ↓ Continuous Testing Platform
```

## Nilai Pembeda

- Mobile-friendly sejak awal
- Dapat berjalan dari SQLite hingga deployment enterprise
- Self-host maupun Cloud menggunakan codebase yang sama
- Manual testing tetap menjadi fondasi; automation dan AI bersifat opsional dan
  bertahap
- Fokus pada workflow QA yang nyata, bukan sekadar mengejar AI

## Visi Jangka Panjang

Menjadikan Testify sebagai platform QA modern yang dapat digunakan oleh siapa
pun—mulai dari pengguna yang ingin menggantikan spreadsheet sederhana hingga
perusahaan yang membutuhkan platform pengujian lengkap dengan kolaborasi,
automation, AI, dan deployment yang fleksibel.
