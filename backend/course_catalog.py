"""
Learnify – Danh mục khóa học (Mock Data)
3 lĩnh vực: Toán, IELTS, Python. Sau này sẽ đọc từ DB thật.
"""

COURSE_CATALOG = [
    # ================================================================
    #  TOÁN HỌC
    # ================================================================
    {
        "course_id": "math_basic",
        "title": "Toán Cơ Bản – Đại Số & Số Học",
        "category": "Toán",
        "level": "Beginner",
        "duration_hours": 20,
        "description": "Nền tảng đại số: phương trình bậc nhất, bất phương trình, hệ phương trình.",
        "skills": ["algebra", "arithmetic"],
        "prerequisites": [],
    },
    {
        "course_id": "math_geometry",
        "title": "Hình Học Phẳng & Không Gian",
        "category": "Toán",
        "level": "Beginner",
        "duration_hours": 18,
        "description": "Tam giác, tứ giác, đường tròn, hình không gian cơ bản.",
        "skills": ["geometry"],
        "prerequisites": [],
    },
    {
        "course_id": "math_algebra2",
        "title": "Đại Số Nâng Cao",
        "category": "Toán",
        "level": "Intermediate",
        "duration_hours": 25,
        "description": "Phương trình bậc hai, hàm số, đồ thị, bất đẳng thức.",
        "skills": ["algebra", "functions"],
        "prerequisites": ["math_basic"],
    },
    {
        "course_id": "math_calculus",
        "title": "Giải Tích – Đạo Hàm & Tích Phân",
        "category": "Toán",
        "level": "Advanced",
        "duration_hours": 30,
        "description": "Giới hạn, đạo hàm, tích phân, ứng dụng trong thực tế.",
        "skills": ["calculus"],
        "prerequisites": ["math_algebra2"],
    },
    {
        "course_id": "math_probability",
        "title": "Xác Suất & Thống Kê",
        "category": "Toán",
        "level": "Intermediate",
        "duration_hours": 20,
        "description": "Xác suất cơ bản, tổ hợp, chỉnh hợp, phân phối xác suất.",
        "skills": ["probability", "statistics"],
        "prerequisites": ["math_basic"],
    },
    {
        "course_id": "math_exam_prep",
        "title": "Luyện Đề Toán Thi Đại Học",
        "category": "Toán",
        "level": "Advanced",
        "duration_hours": 35,
        "description": "10 bộ đề thi thử, phân tích đáp án chi tiết, chiến thuật làm bài.",
        "skills": ["algebra", "calculus", "geometry", "probability"],
        "prerequisites": ["math_calculus", "math_probability"],
    },

    # ================================================================
    #  IELTS
    # ================================================================
    {
        "course_id": "ielts_reading_basic",
        "title": "IELTS Reading Foundation",
        "category": "IELTS",
        "level": "Beginner",
        "duration_hours": 15,
        "description": "Nền tảng đọc hiểu: skimming, scanning, từ vựng học thuật cơ bản.",
        "skills": ["reading", "vocabulary"],
        "prerequisites": [],
    },
    {
        "course_id": "ielts_reading_strategies",
        "title": "IELTS Reading Strategies",
        "category": "IELTS",
        "level": "Intermediate",
        "duration_hours": 25,
        "description": "Chiến thuật Matching Headings, True/False/NG, Summary Completion.",
        "skills": ["reading"],
        "prerequisites": ["ielts_reading_basic"],
    },
    {
        "course_id": "ielts_listening_basic",
        "title": "IELTS Listening Foundation",
        "category": "IELTS",
        "level": "Beginner",
        "duration_hours": 15,
        "description": "Nghe hiểu cơ bản: note-taking, nhận diện keyword, accent training.",
        "skills": ["listening"],
        "prerequisites": [],
    },
    {
        "course_id": "ielts_listening_strategies",
        "title": "IELTS Listening Enhancement",
        "category": "IELTS",
        "level": "Intermediate",
        "duration_hours": 20,
        "description": "Chiến thuật Part 1-4, map labelling, multiple choice.",
        "skills": ["listening"],
        "prerequisites": ["ielts_listening_basic"],
    },
    {
        "course_id": "ielts_writing_task1",
        "title": "IELTS Writing Task 1",
        "category": "IELTS",
        "level": "Intermediate",
        "duration_hours": 20,
        "description": "Mô tả biểu đồ, bảng, quy trình. Cấu trúc, từ vựng, so sánh.",
        "skills": ["writing"],
        "prerequisites": [],
    },
    {
        "course_id": "ielts_writing_task2",
        "title": "IELTS Writing Task 2",
        "category": "IELTS",
        "level": "Intermediate",
        "duration_hours": 25,
        "description": "Essay types: opinion, discussion, problem-solution.",
        "skills": ["writing"],
        "prerequisites": [],
    },
    {
        "course_id": "ielts_speaking",
        "title": "IELTS Speaking Strategies",
        "category": "IELTS",
        "level": "Intermediate",
        "duration_hours": 20,
        "description": "Part 1-2-3, cue cards, fluency & coherence, lexical resource.",
        "skills": ["speaking"],
        "prerequisites": [],
    },
    {
        "course_id": "ielts_vocab_65",
        "title": "IELTS Vocabulary for 6.5",
        "category": "IELTS",
        "level": "Intermediate",
        "duration_hours": 18,
        "description": "2500+ từ học thuật, topic vocabulary, paraphrasing.",
        "skills": ["vocabulary"],
        "prerequisites": [],
    },
    {
        "course_id": "ielts_grammar",
        "title": "Grammar for IELTS",
        "category": "IELTS",
        "level": "Intermediate",
        "duration_hours": 15,
        "description": "Complex sentences, conditionals, relative clauses, tenses.",
        "skills": ["grammar"],
        "prerequisites": [],
    },
    {
        "course_id": "ielts_mock_tests",
        "title": "Full IELTS Mock Tests",
        "category": "IELTS",
        "level": "Advanced",
        "duration_hours": 20,
        "description": "5 bộ mock test đầy đủ 4 kỹ năng, tính thời gian thật.",
        "skills": ["reading", "listening", "writing", "speaking"],
        "prerequisites": ["ielts_reading_strategies", "ielts_listening_strategies"],
    },

    # ================================================================
    #  PYTHON LẬP TRÌNH
    # ================================================================
    {
        "course_id": "python_intro",
        "title": "Python Cho Người Mới Bắt Đầu",
        "category": "Python",
        "level": "Beginner",
        "duration_hours": 20,
        "description": "Biến, kiểu dữ liệu, vòng lặp, hàm, input/output cơ bản.",
        "skills": ["python", "programming_basics"],
        "prerequisites": [],
    },
    {
        "course_id": "python_data_structures",
        "title": "Cấu Trúc Dữ Liệu Python",
        "category": "Python",
        "level": "Intermediate",
        "duration_hours": 22,
        "description": "List, Dict, Set, Tuple, Stack, Queue, thuật toán sắp xếp & tìm kiếm.",
        "skills": ["python", "data_structures"],
        "prerequisites": ["python_intro"],
    },
    {
        "course_id": "python_oop",
        "title": "Lập Trình Hướng Đối Tượng Python",
        "category": "Python",
        "level": "Intermediate",
        "duration_hours": 20,
        "description": "Class, Object, Inheritance, Polymorphism, Encapsulation.",
        "skills": ["python", "oop"],
        "prerequisites": ["python_intro"],
    },
    {
        "course_id": "python_web",
        "title": "Lập Trình Web với Flask/FastAPI",
        "category": "Python",
        "level": "Intermediate",
        "duration_hours": 28,
        "description": "RESTful API, routing, database integration, authentication.",
        "skills": ["python", "web_development"],
        "prerequisites": ["python_oop"],
    },
    {
        "course_id": "python_data_science",
        "title": "Data Science với Python",
        "category": "Python",
        "level": "Advanced",
        "duration_hours": 35,
        "description": "Pandas, NumPy, Matplotlib, data cleaning, EDA, visualization.",
        "skills": ["python", "data_science"],
        "prerequisites": ["python_data_structures"],
    },
    {
        "course_id": "python_ml_intro",
        "title": "Machine Learning Cơ Bản",
        "category": "Python",
        "level": "Advanced",
        "duration_hours": 30,
        "description": "Scikit-learn, regression, classification, clustering, model evaluation.",
        "skills": ["python", "machine_learning"],
        "prerequisites": ["python_data_science"],
    },
    {
        "course_id": "python_projects",
        "title": "5 Dự Án Python Thực Tế",
        "category": "Python",
        "level": "Intermediate",
        "duration_hours": 25,
        "description": "Web scraper, chatbot, game, API, automation – từ ý tưởng đến deploy.",
        "skills": ["python", "projects"],
        "prerequisites": ["python_oop"],
    },
]


def lay_tat_ca_khoa_hoc() -> list[dict]:
    """Lấy toàn bộ danh mục khóa học."""
    return COURSE_CATALOG


def lay_khoa_hoc(course_id: str) -> dict | None:
    """Lấy 1 khóa học theo ID."""
    for course in COURSE_CATALOG:
        if course["course_id"] == course_id:
            return course
    return None


def tim_khoa_hoc(category: str = None, skills: list[str] = None, level: str = None) -> list[dict]:
    """Tìm khóa học theo lĩnh vực, kỹ năng, trình độ."""
    ket_qua = COURSE_CATALOG
    if category:
        ket_qua = [c for c in ket_qua if c["category"] == category]
    if skills:
        ket_qua = [c for c in ket_qua if any(s in c["skills"] for s in skills)]
    if level:
        ket_qua = [c for c in ket_qua if c["level"] == level]
    return ket_qua


def lay_khoa_hoc_theo_ids(course_ids: list[str]) -> list[dict]:
    """Lấy nhiều khóa học theo danh sách IDs."""
    return [c for c in COURSE_CATALOG if c["course_id"] in course_ids]


def lay_danh_muc() -> list[str]:
    """Lấy danh sách các lĩnh vực."""
    return list(set(c["category"] for c in COURSE_CATALOG))
