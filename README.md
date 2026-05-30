# 똘레랑스 기록실

FC 똘레랑스 공식 경기 기록 웹앱

## 배포 주소

**https://leesj7496-lab.github.io/tole-records/**

---

## 기능

| 화면 | 설명 |
|------|------|
| 메인 | 로고, 타이틀, 3개 메뉴 버튼 |
| 경기별 기록 | 날짜/장소/상대팀/스코어/결과 리스트 + 상세 |
| 기록 통계 | 골·어시스트·참석 순위 (정식 팀원만) |
| 경기 기록하기 | 비밀번호 보호 입력 화면 (기록원 전용) |

---

## 파일 구조

```
fc-tole/
├── index.html          # 메인 HTML (SPA - 5개 화면)
├── players.json        # 정식 팀원 31명 명단
├── assets/
│   └── logo.jpg        # FC 똘레랑스 로고 (교체 예정)
├── css/
│   └── style.css       # 블랙/골드/화이트 테마
├── js/
│   ├── app.js          # 화면 라우팅, 비밀번호 인증
│   ├── api.js          # 데이터 레이어 (localStorage / Google Sheets 스텁)
│   ├── match.js        # 경기 목록·상세 렌더링
│   ├── stats.js        # 통계 계산·렌더링
│   └── record.js       # 기록 입력 폼
└── README.md
```

---

## 데이터 저장

현재는 **브라우저 localStorage**에 저장됩니다.  
첫 실행 시 더미 데이터(5경기)가 자동으로 로드됩니다.

---

## Google Sheets 연동 (추후)

### 시트 구조

**matches 시트**

| 컬럼 | 설명 |
|------|------|
| match_id | 경기 고유 ID |
| date | 날짜 (YYYY-MM-DD) |
| location | 경기 장소 |
| opponent | 상대팀명 |
| our_score | 우리 팀 점수 |
| opp_score | 상대 팀 점수 |
| result | 결과 (승/무/패) |
| members | 참여 멤버 (쉼표 구분, 용병은 이름 뒤 `(용병)` 태그) |
| summary | 총평 (없을 수 있음) |

**goals 시트**

| 컬럼 | 설명 |
|------|------|
| goal_id | 골 고유 ID |
| match_id | 경기 ID |
| scorer | 득점 선수 |
| assist | 어시스트 선수 (`없음` 가능) |
| description | 상황 묘사 |

### 연동 방법

1. `js/api.js` 상단의 `SHEET_ID`, `API_KEY` 설정
2. `api.fetchMatchesFromSheets()` / `api.fetchGoalsFromSheets()` 주석 해제
3. 쓰기(기록 저장)는 OAuth2 인증 또는 서버사이드 처리 필요

---

## 용병 처리 규칙

- 참여 멤버에서 "용병 추가" 버튼으로 이름 직접 입력
- 해당 경기의 골/어시스트 드롭다운에 자동 포함
- 이름 뒤에 `(용병)` 태그 자동 부착 (예: `홍길동(용병)`)
- **통계 집계에서 제외** (정식 팀원 31명만 집계)

---

## 로컬 실행

브라우저에서 바로 열거나 간단한 HTTP 서버 사용:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

http://localhost:8000 접속

---

## 팀원 명단 (31명)

이상재, 공현웅, 곽상현, 권이현, 김강엽, 김용재, 김우재, 김종환, 김준영,
박동민, 박아론, 박병현, 박성순, 박정수, 박지용, 박현철, 김준섭, 오신근,
이종혁, 이종호, 임재빈, 전기석, 정승균, 정재훈, 정진호, 정환도, 조병윤,
조현식, 주상묵, 최지운, 정태광
