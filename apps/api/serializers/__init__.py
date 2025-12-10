"""
API Serializers for PO Pilot Application
Exports all serializers for easy importing in views and APIs.
"""

# Core serializers
from .core import (
    DepartmentSerializer,
    DepartmentDetailSerializer,
    ProgramOutcomeSerializer,
    ProgramOutcomeDetailSerializer,
)

# User serializers
from .users import (
    UserMeSerializer,
    UserSerializer,
    StudentSerializer,
    InstructorSerializer,
    DepartmentHeadSerializer,
)

# Course serializers
from .courses import (
    CourseTemplateSerializer,
    CourseTemplateDetailSerializer,
    CourseInstanceSerializer,
    CourseInstanceDetailSerializer,
    LearningOutcomeSerializer,
    LearningOutcomeDetailSerializer,
    AssessmentSerializer,
    AssessmentDetailSerializer,
    AssessmentToLOContributionSerializer,
    LOtoPOContributionSerializer,
    LOtoPOContributionDetailSerializer,
)

# Grade serializers
from .grades import (
    AssessmentGradeSerializer,
    AssessmentGradeDetailSerializer,
    StudentGradeReportSerializer,
)

# Achievement serializers
from .achievements import (
    POAchievementSerializer,
    CourseAchievementSerializer,
    StudentOverallReportSerializer,
    DepartmentStatisticsSerializer,
    LOContributionAnalysisSerializer,
    AssessmentImpactAnalysisSerializer,
)

__all__ = [
    # Core
    "DepartmentSerializer",
    "DepartmentDetailSerializer",
    "ProgramOutcomeSerializer",
    "ProgramOutcomeDetailSerializer",
    # Users
    "UserMeSerializer",
    "UserSerializer",
    "StudentSerializer",
    "InstructorSerializer",
    "DepartmentHeadSerializer",
    # Courses
    "CourseTemplateSerializer",
    "CourseTemplateDetailSerializer",
    "CourseInstanceSerializer",
    "CourseInstanceDetailSerializer",
    "LearningOutcomeSerializer",
    "LearningOutcomeDetailSerializer",
    "AssessmentSerializer",
    "AssessmentDetailSerializer",
    "AssessmentToLOContributionSerializer",
    "LOtoPOContributionSerializer",
    "LOtoPOContributionDetailSerializer",
    # Grades
    "AssessmentGradeSerializer",
    "AssessmentGradeDetailSerializer",
    "StudentGradeReportSerializer",
    # Achievements
    "POAchievementSerializer",
    "CourseAchievementSerializer",
    "StudentOverallReportSerializer",
    "DepartmentStatisticsSerializer",
    "LOContributionAnalysisSerializer",
    "AssessmentImpactAnalysisSerializer",
]
