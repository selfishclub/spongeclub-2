import subprocess
import os

# =============================================
# 🐾 도그 피트니스 교육 영상 자르기 도구
# =============================================
#
# 사용법:
# 1. VIDEO_FILE에 영상 파일 경로를 입력하세요
# 2. SEGMENTS에 운동 이름과 시작/끝 시간을 입력하세요
# 3. 터미널에서 실행: python 영상자르기.py
# =============================================

# ▼▼▼ 여기를 채우세요 ▼▼▼

VIDEO_FILE = r"F:\Fitness\20260701_타니.mp4"   # 영상 파일 경로

SEGMENTS = [
    # ("운동이름",        "시작시간",    "끝시간"),
    ("피봇",            "00:00:30",   "00:02:12"),
    ("stand_still",    "00:04:25",   "00:04:32"),
    ("FF_side",        "00:06:50",   "00:09:40"),
    ("정지컨트롤",       "00:16:40",   "00:19:39"),
    ("비탈에서앉아",     "00:20:18",   "00:23:10"),
]

# ▲▲▲ 여기까지만 바꾸면 됩니다 ▲▲▲


def cut_video(video_file, segments):
    if not os.path.exists(video_file):
        print(f"❌ 영상 파일을 찾을 수 없어요: {video_file}")
        return

    output_dir = os.path.dirname(video_file)
    base_name = os.path.splitext(os.path.basename(video_file))[0]
    ext = os.path.splitext(video_file)[1]

    print(f"\n[시작] 영상 자르기: {os.path.basename(video_file)}")
    print(f"[저장 위치] {output_dir}\n")

    for i, (name, start, end) in enumerate(segments, 1):
        output_file = os.path.join(output_dir, f"{base_name}_{i:02d}_{name}{ext}")
        print(f"[{i}/{len(segments)}] {name} ({start} ~ {end}) 처리 중...")

        cmd = [
            "ffmpeg", "-y",
            "-i", video_file,
            "-ss", start,
            "-to", end,
            "-c", "copy",
            output_file
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0:
            print(f"   완료: {os.path.basename(output_file)}")
        else:
            print(f"   오류 발생: {name}")
            print(result.stderr[-300:])

    print(f"\n완료! {len(segments)}개 운동 파일이 저장됐어요.")


if __name__ == "__main__":
    cut_video(VIDEO_FILE, SEGMENTS)
