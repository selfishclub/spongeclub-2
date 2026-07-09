import subprocess
import os
import cv2
import numpy as np

# =============================================
# 도그 피트니스 - 색상 마커 감지 자르기 도구
# 초록색 = 운동 시작 / 주황색 = 운동 끝
# 마커 사이 구간만 저장, 준비 과정은 제외
# =============================================

# ▼▼▼ 여기만 바꾸세요 ▼▼▼

VIDEO_FILE = r"F:\Fitness\홍구름\20260703_홍구름.mp4"

# 화면에서 색상이 이 비율 이상 차지하면 마커로 인식 (기본 3%)
COLOR_RATIO = 0.03

# 이 초 미만 구간은 오탐지로 보고 제외 (기본 10초)
MIN_SEGMENT_SECONDS = 10

# ▲▲▲ 여기까지만 바꾸면 됩니다 ▲▲▲


def detect_color(frame, color):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    small = cv2.resize(hsv, (320, 180))

    if color == "green":
        mask = cv2.inRange(small, np.array([35, 80, 60]), np.array([85, 255, 255]))
    elif color == "orange":
        mask = cv2.inRange(small, np.array([5, 150, 100]), np.array([25, 255, 255]))
    else:
        return False

    ratio = np.count_nonzero(mask) / (320 * 180)
    return ratio > COLOR_RATIO


def frames_to_tc(frame, fps):
    total_sec = frame / fps
    h = int(total_sec // 3600)
    m = int((total_sec % 3600) // 60)
    s = total_sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def find_markers(video_file):
    cap = cv2.VideoCapture(video_file)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    sample_every = max(1, int(fps // 6))  # 초당 6프레임 샘플링

    print(f"[분석 중] {os.path.basename(video_file)}")
    print(f"  초당 {fps:.1f}프레임, 총 {total_frames//int(fps)//60}분 {total_frames//int(fps)%60}초\n")

    in_green = False
    in_orange = False
    green_start = None
    segments = []
    current_start = None

    frame_idx = 0
    last_pct = -1

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_every == 0:
            is_green = detect_color(frame, "green")
            is_orange = detect_color(frame, "orange")

            # 초록 마커 시작 감지
            if is_green and not in_green:
                in_green = True
                green_start = frame_idx

            # 초록 마커 끝 → 운동 구간 시작
            if not is_green and in_green:
                in_green = False
                current_start = frame_idx
                print(f"  초록 마커 감지 → 운동 시작: {frames_to_tc(current_start, fps)}")

            # 주황 마커 시작 감지 → 운동 구간 끝
            if is_orange and not in_orange:
                in_orange = True
                if current_start is not None:
                    segments.append((current_start, frame_idx))
                    print(f"  주황 마커 감지 → 운동 끝:   {frames_to_tc(frame_idx, fps)}")
                    current_start = None

            if not is_orange and in_orange:
                in_orange = False

        pct = int(frame_idx / total_frames * 100)
        if pct % 10 == 0 and pct != last_pct:
            print(f"  진행중... {pct}%")
            last_pct = pct

        frame_idx += 1

    cap.release()
    return segments, fps


def split_video(video_file, segments, fps):
    output_dir = os.path.dirname(video_file)
    base_name = os.path.splitext(os.path.basename(video_file))[0]
    ext = os.path.splitext(video_file)[1]

    print(f"\n총 {len(segments)}개 운동 구간 발견")
    print("[자르기 시작]\n")

    for i, (start_frame, end_frame) in enumerate(segments, 1):
        start_tc = frames_to_tc(start_frame, fps)
        end_tc = frames_to_tc(end_frame, fps)
        output_file = os.path.join(output_dir, f"{base_name}_{i:02d}{ext}")

        print(f"[{i}/{len(segments)}] {start_tc} ~ {end_tc} 처리 중...")

        cmd = [
            "ffmpeg", "-y",
            "-i", video_file,
            "-ss", start_tc,
            "-to", end_tc,
            "-c", "copy",
            output_file
        ]

        result = subprocess.run(cmd, capture_output=True)
        if result.returncode == 0:
            size_mb = os.path.getsize(output_file) / 1024 / 1024
            print(f"   완료: {os.path.basename(output_file)} ({size_mb:.1f}MB)")
        else:
            print(f"   오류: {i}번 구간")

    print(f"\n완료! {len(segments)}개 파일이 저장됐어요.")
    print(f"저장 위치: {output_dir}")


if __name__ == "__main__":
    if not os.path.exists(VIDEO_FILE):
        print(f"영상 파일을 찾을 수 없어요: {VIDEO_FILE}")
    else:
        segments, fps = find_markers(VIDEO_FILE)
        if not segments:
            print("\n마커를 찾지 못했어요.")
            print("초록/주황 색상이 화면에 충분히 보이는지 확인해주세요.")
            print("COLOR_RATIO 값을 낮춰보는 것도 방법이에요 (예: 0.01)")
        else:
            # 너무 짧은 구간 필터링 (오탐지 제거)
            min_frames = MIN_SEGMENT_SECONDS * fps
            filtered = [(s, e) for s, e in segments if (e - s) >= min_frames]
            removed = len(segments) - len(filtered)
            if removed > 0:
                print(f"\n{MIN_SEGMENT_SECONDS}초 미만 구간 {removed}개 제외 (오탐지 필터)")
            split_video(VIDEO_FILE, filtered, fps)
