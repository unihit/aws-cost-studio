# AWS Cost Studio · 비용 계산기

> 리전별 실제 AWS 요율 데이터로 설계하는 초고속 클라우드 인프라 아키텍처 비용 계산기 & FinOps 스튜디오

[![Deploy to GitHub Pages](https://github.com/unihit/aws-cost-studio/actions/workflows/deploy.yml/badge.svg)](https://github.com/unihit/aws-cost-studio/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=flat&logo=github)](https://unihit.github.io/aws-cost-studio/)

![AWS Cost Studio Dashboard Dark](screenshots/dashboard-dark.png)

---

## 🌟 주요 기능 (Key Features)

- **AWS 공식 Pricing Calculator 실측 요율 연동**:
  - `ap-northeast-2 (서울)`을 포함한 8대 핵심 리전(`서울`, `도쿄`, `싱가포르`, `시드니`, `버지니아`, `오리건`, `프랑크푸르트`, `아일랜드`)의 최신 온디맨드 단가 데이터 내장
  - 오프라인/정적 환경에서도 즉시 실시간 비용 계산 지원
- **7개 핵심 인프라 서비스 정밀 산출**:
  - **Amazon EC2**: Graviton(`t4g`, `m6g`, `c7g`, `r7g`), Intel(`m6i`, `c6i`), GPU(`g4dn`, `g5`) 등 최신 인스턴스 패밀리 및 월간 가동률(%) 반영
  - **Amazon EBS**: gp3, io2 볼륨 스토리지 요금 및 프로비저닝 IOPS / Throughput 할증 정밀 계산
  - **Amazon RDS**: PostgreSQL / MySQL 엔진, Multi-AZ 구성, gp3/io1 스토리지 요율 통합
  - **Amazon S3**: Standard, Glacier Deep Archive 등 스토리지 계단식 요율 및 요청(PUT/GET) 단가
  - **NAT Gateway**: 인스턴스 시간당 요금 + 처리 데이터(GB) 비용
  - **Application Load Balancer (ALB)**: 기본 가동 시간 요금 + LCU(Load Balancer Capacity Unit) 사용량
  - **Data Transfer**: 인터넷 아웃바운드 구간별(10TB, 40TB, 100TB) 티어링 요율 자동 적용
- **원클릭 아키텍처 프리셋 (Architecture Presets)**:
  - 🚀 **스타트업 MVP 스택**: 2× EC2 + RDS + S3 + ALB 가성비 기본 스택
  - 🛡️ **고가용성 프로덕션 웹**: Multi-AZ RDS + 이중화 NAT GW + 고성능 gp3 볼륨
  - 🤖 **AI / ML 추론 파이프라인**: GPU 인스턴스(g5) + 대용량 S3 + 초고속 Throughput
- **FinOps 인사이트 & 최적화 제안 (FinOps Insights)**:
  - Graviton 마이그레이션 절감액 예측, NAT Gateway 비용 최적화, S3 Lifecycle 정책 제안
- **다국적 통화 환율 지원 (USD / KRW)**:
  - 실시간 기준 환율 토글로 원화/달러 환산 즉시 지원
- **문서화 및 내보내기 (Export & Share)**:
  - 기술 검토 보고서용 **Markdown 견적 리포트** 생성 및 클립보드 복사
  - 아키텍처 재사용을 위한 **JSON 설정 내보내기/가져오기**

---

## 🖥️ 스크린샷 (Screenshots)

| 서비스 추가 드로어 (Dark) | 라이트 모드 대시보드 |
| :---: | :---: |
| ![Catalog Drawer](screenshots/catalog-dark.png) | ![Light Dashboard](screenshots/dashboard-light.png) |

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Lucide Icons
- **Data Visualization**: Recharts (도넛 차트 및 카테고리별 비용 시각화)
- **Deployment**: GitHub Actions, GitHub Pages

---

## 🚀 로컬 실행 방법 (Getting Started)

```bash
# 1. 저장소 복제
git clone https://github.com/unihit/aws-cost-studio.git
cd aws-cost-studio

# 2. 의존성 패키지 설치
npm install

# 3. 개발 서버 실행
npm run dev

# 4. 프로덕션 빌드
npm run build
npm run preview
```

---

## 📄 라이선스 (License)

MIT License. AWS 요율 데이터는 Amazon Web Services 공개 요율표를 기반으로 합니다.
