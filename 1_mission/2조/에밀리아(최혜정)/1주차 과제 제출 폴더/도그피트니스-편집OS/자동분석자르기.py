import subprocess
import os
import cv2
import numpy as np

# =============================================
# 도그 피트니스 교육 영상 자동 분석 자르기 도구
# =============================================
# 운동 중 움직임이 많고, 세팅 시간에는 움직임이 줄어드는 패턴으로
# 구간 경계를 자동 감지합니다.
# =============================================

# ▼▼▼ 여기만 바꾸세요 ▼▼▼

VIDEO_FILE = r"F:\Fitness\20260701_타니.mp4"

# 세팅 시간 판단 기준: 이 초 이상 조용하면 구간 경계로 봄 (기본 8초)
QUIET_SECONDS = 8

# 움직임 민감도: 숫자가 낮을수록 작은 움직임도 감지 (기본 5)
MOTION_THRESHOLD = 5

# ▲▲▲ 여기까지만 바꾸면 됩니다 ▲▲▲


def detect_motion_splits(video_file, quiet_seconds, motion_threshold):
    if not os.path.exists(video_file):
        print(f"영상 파일을 찾을 수 없어요: {video_file}")
        return []

    print(f"[분석 중] {os.path.basename(video_file)}")
    print("움직임 패턴을 분석하고 있어요 (시간이 걸릴 수 있어요)...\n")

    cap = cv2.VideoCapture(video_file)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    quiet_frames = int(quiet_seconds * fps)

    prev_gray = None
    motion_scores = []
    frame_idx = 0
    sample_every = max(1, int(fps // 4))  # 초당 4프레임만 샘플링

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_every == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, (320, 180))

            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                score = np.mean(diff)
                motion_scores.append((frame_idx, score))

            prev_gray = gray

        if frame_idx % (total_frames // 20) == 0:
            pct = int(frame_idx / total_frames * 100)
            print(f"  진행중... {pct}%")

        frame_idx += 1

    cap.release()

    # 움직임이 적은 구간(세팅 시간) 찾기
    quiet_threshold = motion_threshold
    in_quiet = False
    quiet_start = None
    splits = []

    for frame_no, score in motion_scores:
        if score < quiet_threshold:
            if not in_quiet:
                in_quiet = True
                quiet_start = frame_no
        else:
            if in_quiet:
                quiet_end = frame_no
                if (quiet_end - quiet_start) >= quiet_frames:
                    mid = (quiet_start + quiet_end) // 2
                    splits.append(mid)
                in_quiet = False

    return splits, fps, total_frames


def frames_to_timecode(frame, fps):
    total_sec = int(frame / fps)
    h = total_sec // 3600
    m = (total_sec % 3600) // 60
    s = total_sec % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def split_video(video_file, splits, fps, total_frames):
    output_dir = os.path.dirname(video_file)
    base_name = os.path.splitext(os.path.basename(video_file))[0]
    ext = os.path.splitext(video_file)[1]

    boundaries = [0] + splits + [total_frames]
    segments = []
    for i in range(len(boundaries) - 1):
        start_tc = frames_to_timecode(boundaries[i], fps)
        end_tc = frames_to_timecode(boundaries[i + 1], fps)
        segments.append((start_tc, end_tc))

    print(f"\n총 {len(segments)}개 구간 발견:\n")
    for i, (s, e) in enumerate(segments, 1):
        print(f"  {i:02d}번: {s} ~ {e}")

    print("\n[자르기 시작]\n")

    for i, (start_tc, end_tc) in enumerate(segments, 1):
        output_file = os.path.join(output_dir, f"{base_name}_자동_{i:02d}{ext}")
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
            print(f"   완료: {os.path.basename(output_file)}")
        else:
            print(f"   오류: {i}번 구간")

    print(f"\n완료! {len(segments)}개 파일이 {output_dir} 에 저장됐어요.")


if __name__ == "__main__":
    result = detect_motion_splits(VIDEO_FILE, QUIET_SECONDS, MOTION_THRESHOLD)
    if result:
        splits, fps, total_frames = result
        if not splits:
            print("\n구간 경계를 찾지 못했어요.")
            print("QUIET_SECONDS를 줄이거나 MOTION_THRESHOLD를 낮춰보세요.")
        else:
            split_video(VIDEO_FILE, splits, fps, total_frames)
