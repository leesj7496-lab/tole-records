# 똘레랑스 기록실

FC 똘레랑스 공식 경기 기록 웹앱

## 배포 주소

**https://leesj7496-lab.github.io/tole-records/**

---

## 기능

| 화면 | 설명 |
|------|------|
| 메인 | 로고, 타이틀, 3개 메뉴 버튼 |
| 경기별 기록 | 캘린더/리스트 뷰, 경기 상세 |
| 기록 통계 | 골·어시스트·참석 순위 (정식 팀원만) |
| 경기 기록하기 | 비밀번호 보호 4단계 입력 화면 (기록원 전용) |

---

## 파일 구조

```
fc-tole/
├── index.html              # 메인 HTML (SPA)
├── players.json            # 정식 팀원 31명 명단
├── assets/
│   └── 똘레랑스_로고.jpg
├── css/
│   └── style.css           # 화이트/골드/블랙 테마
├── js/
│   ├── app.js              # 화면 라우팅, 비밀번호 인증
│   ├── api.js              # 데이터 레이어 (localStorage → Sheets 교체 예정)
│   ├── match.js            # 경기 목록·캘린더·상세 렌더링
│   ├── stats.js            # 통계 계산·렌더링
│   └── record.js           # 기록 입력 폼 (4단계 위저드 + 임시저장)
├── apps-script/
│   └── code.gs             # Google Apps Script API 코드
└── README.md
```

---

## 데이터 저장

현재는 **브라우저 localStorage**에 저장됩니다.  
Google Sheets 연동 후 `api.js`의 데이터 레이어를 교체합니다.

---

## Google Sheets + Apps Script 연동

### 스프레드시트

**https://docs.google.com/spreadsheets/d/18Wu44N_fUD8oVIpYCsVb8fi9jWn-vPqOKSLwGPEyPVo**

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
| summary | 총평 |

**goals 시트**

| 컬럼 | 설명 |
|------|------|
| goal_id | 골 고유 ID |
| match_id | 경기 ID |
| scorer | 득점 선수 |
| assist | 어시스트 선수 (`없음` 가능) |
| description | 상황 묘사 |

**photos 시트**

| 컬럼 | 설명 |
|------|------|
| photo_id | 사진 고유 ID |
| match_id | 경기 ID |
| drive_url | Google Drive 공유 URL |

---

### Apps Script 등록 방법

#### 1단계 — Apps Script 열기

1. [스프레드시트](https://docs.google.com/spreadsheets/d/18Wu44N_fUD8oVIpYCsVb8fi9jWn-vPqOKSLwGPEyPVo)를 열기
2. 상단 메뉴 **확장 프로그램 > Apps Script** 클릭

#### 2단계 — 코드 붙여넣기

1. 기본으로 열리는 `Code.gs` 파일의 내용을 전체 선택 후 삭제
2. `apps-script/code.gs` 파일의 내용을 전체 복사하여 붙여넣기
3. **저장** (Ctrl+S)

#### 3단계 — 시트 초기 설정

1. 에디터 상단 함수 선택 드롭다운에서 **`setupSheets`** 선택
2. **▶ 실행** 클릭
3. 권한 요청 팝업 → **권한 검토 > 고급 > (프로젝트 이름)(으)로 이동 > 허용**
4. 스프레드시트에 `matches`, `goals`, `photos` 시트와 헤더가 자동 생성됨

#### 4단계 — 웹앱으로 배포

1. 에디터 우측 상단 **배포 > 새 배포** 클릭
2. 유형 선택: **웹 앱**
3. 설정:
   - **설명**: FC 똘레랑스 기록실 API v1
   - **다음 사용자로 실행**: 나 (leesj7496@gmail.com)
   - **액세스 권한**: 모든 사용자
4. **배포** 클릭
5. **웹 앱 URL** 복사 (형식: `https://script.google.com/macros/s/.../exec`)

> 코드를 수정한 뒤에는 **배포 > 배포 관리 > 수정 > 버전: 새 버전**으로 재배포해야 반영됩니다.

#### 5단계 — api.js에 URL 설정

`js/api.js` 상단의 주석 처리된 스텁 코드를 찾아 아래와 같이 실제 구현으로 교체합니다:

```javascript
// js/api.js 상단에 추가
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/여기에_배포_URL/exec';

// getMatches() 교체
async getMatches() {
  const res  = await fetch(`${APPS_SCRIPT_URL}?action=getMatches`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data.sort((a, b) => a.date.localeCompare(b.date));
},

// getMatch() 교체
async getMatch(matchId) {
  const res  = await fetch(`${APPS_SCRIPT_URL}?action=getMatch&matchId=${matchId}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data.match;
},

// saveMatch() 교체 (Content-Type: text/plain — CORS 우회)
async saveMatch(matchData, goalsData) {
  const body = JSON.stringify({
    action: 'saveMatch',
    match:  matchData,
    goals:  goalsData,
    photos: []
  });
  const res  = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body:   body          // Content-Type 헤더를 생략해야 Simple Request로 처리됨
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data.match_id;
},
```

> **CORS 참고**: GAS 웹앱은 브라우저의 CORS preflight(OPTIONS)를 처리하지 않습니다.  
> POST 요청 시 `Content-Type` 헤더를 지정하지 않으면 브라우저가 `text/plain`으로 전송하여  
> preflight 없이 Simple Request로 처리되므로 CORS 오류를 우회할 수 있습니다.

---

### API 엔드포인트 요약

| 메서드 | 파라미터 / 바디 | 설명 |
|--------|----------------|------|
| `GET`  | `?action=setup` | 시트 헤더 초기 생성 |
| `GET`  | `?action=getMatches` | 전체 경기 목록 조회 |
| `GET`  | `?action=getMatch&matchId=m001` | 경기 상세 조회 |
| `POST` | `{ action: "saveMatch", match: {...}, goals: [...], photos: [...] }` | 새 경기 저장 |

---

## 용병 처리 규칙

- 참여 멤버에서 "용병 추가" 버튼으로 이름 직접 입력
- 이름 뒤에 `(용병)` 태그 자동 부착 (예: `홍길동(용병)`)
- 골/어시스트 드롭다운에 자동 포함
- **통계 집계에서 제외** (정식 팀원 31명만 집계)

---

## 로컬 실행

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
