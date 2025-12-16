"""
API Serializers for PO Pilot Application
Exports all serializers for easy importing in views and APIs.
"""

# Core serializers
from .core import (
    DepartmentWriteSerializer,
    DepartmentListSerializer,
    DepartmentDetailSerializer,
    DepartmentSimpleSerializer,
    ProgramOutcomeWriteSerializer,
    ProgramOutcomeListSerializer,
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
    CourseTemplateWriteSerializer,
    CourseTemplateListSerializer,
    CourseTemplateDetailSerializer,
    CourseInstanceWriteSerializer,
    CourseInstanceListSerializer,
    CourseInstanceDetailSerializer,
    LearningOutcomeWriteSerializer,
    LearningOutcomeListSerializer,
    LearningOutcomeDetailSerializer,
    AssessmentWriteSerializer,
    AssessmentListSerializer,
    AssessmentDetailSerializer,
    AssessmentToLOContributionWriteSerializer,
    AssessmentToLOContributionListSerializer,
    LOtoPOContributionWriteSerializer,
    LOtoPOContributionListSerializer,
    LOtoPOContributionDetailSerializer,
    CourseLOAchievementSerializer,
    StudentEnrollmentSerializer,
    StudentUnenrollSerializer,
)

# Grade serializers
from .grades import (
    AssessmentGradeSerializer,
    AssessmentGradeDetailSerializer,
    StudentGradeReportSerializer,
    BulkGradeItemSerializer,
    BulkGradeCreateSerializer,
    BulkGradeUpdateSerializer,
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
    "DepartmentWriteSerializer",
    "DepartmentListSerializer",
    "DepartmentDetailSerializer",
    "DepartmentSimpleSerializer",
    "ProgramOutcomeWriteSerializer",
    "ProgramOutcomeListSerializer",
    "ProgramOutcomeDetailSerializer",
    # Users
    "UserMeSerializer",
    "UserSerializer",
    "StudentSerializer",
    "InstructorSerializer",
    "DepartmentHeadSerializer",
    # Courses
    "CourseTemplateWriteSerializer",
    "CourseTemplateListSerializer",
    "CourseTemplateDetailSerializer",
    "CourseInstanceWriteSerializer",
    "CourseInstanceListSerializer",
    "CourseInstanceDetailSerializer",
    "LearningOutcomeWriteSerializer",
    "LearningOutcomeListSerializer",
    "LearningOutcomeDetailSerializer",
    "AssessmentWriteSerializer",
    "AssessmentListSerializer",
    "AssessmentDetailSerializer",
    "AssessmentToLOContributionWriteSerializer",
    "AssessmentToLOContributionListSerializer",
    "LOtoPOContributionWriteSerializer",
    "LOtoPOContributionListSerializer",
    "LOtoPOContributionDetailSerializer",
    # Grades
    "AssessmentGradeSerializer",
    "AssessmentGradeDetailSerializer",
    "StudentGradeReportSerializer",
    "BulkGradeItemSerializer",
    "BulkGradeCreateSerializer",
    "BulkGradeUpdateSerializer",
    # Course Actions
    "CourseLOAchievementSerializer",
    "StudentEnrollmentSerializer",
    "StudentUnenrollSerializer",
    # Achievements
    "POAchievementSerializer",
    "CourseAchievementSerializer",
    "StudentOverallReportSerializer",
    "DepartmentStatisticsSerializer",
    "LOContributionAnalysisSerializer",
    "AssessmentImpactAnalysisSerializer",
]
