# Project Rules & Workflow Guidelines

## Post-Task Workflow (Mandatory)
모든 코드 수정 및 작업 완료 후에는 반드시 다음 4단계를 순서대로 수행해야 합니다:

1. **테스트 검증 (Test)**:
   ```bash
   node --test tests/*.test.mjs
   ```
2. **프로덕션 빌드 (Build)**:
   ```bash
   npm run build
   ```
3. **서비스 재시작 (Restart)**:
   ```bash
   bash scripts/restart.sh
   ```
4. **Git 커밋 및 원격 푸시 (Push)**:
   ```bash
   git add .
   git commit -m "<작업 내용에 대한 명확한 설명>"
   git push origin main
   ```

## Development Conventions
- **Clean Architecture & Modularity**: 단일 컴포넌트에 거대한 코드가 집중되지 않도록 기능별(보드, 키패드, 모달, 사운드, 훅 등)로 분리하여 유지보수성을 극대화합니다.
- **Audio & Haptic Feedback**: Web Audio API는 단일 공유 싱글톤(`AudioContext`)을 유지하여 브라우저 자동 재생 정책에 걸리지 않도록 하고, 사용자 첫 인터랙션 시 잠금 해제하며 편안하고 명확한 볼륨의 오디오 피드백을 제공합니다.
- **UI/UX Excellence**: 세련된 다크/글래스모피즘 디자인, 일관된 간격 및 타이포그래피, 직관적인 시각적 피드백(선택 셀, 연관 행/열/박스 하이라이트, 동일 숫자 하이라이트 등)을 적용합니다.
- **Full Compatibility**: Next.js App Router 빌드, WebSocket/HTTP 공유 방(`server.mjs`), 노드 단위 테스트가 깨지지 않도록 호환성을 항시 유지합니다.
- **Mandatory Execution**: 모든 프롬프트 작업 후 예외 없이 테스트(Test) -> 빌드(Build) -> 재시작(Restart) -> 커밋 & 푸시(Push)를 순서대로 수행합니다.
