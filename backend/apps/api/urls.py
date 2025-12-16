from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.auth import RegisterView, LoginView, CustomTokenRefreshView, LogoutView
from apps.api.views.courses import (
    CourseTemplateViewSet,
    CourseInstanceViewSet,
    AssessmentViewSet,
    LearningOutcomeViewSet,
    AssessmentToLOContributionViewSet,
)
from apps.api.views.grades import GradeViewSet
from apps.api.views.core import (
    DepartmentViewSet,
    ProgramOutcomeViewSet,
    LOToPOContributionViewSet
)
from apps.api.views.users import MeView, UserViewSet

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"program-outcomes", ProgramOutcomeViewSet, basename="program-outcome")
router.register(r"lo-po-contributions", LOToPOContributionViewSet, basename="lo-po-contribution")
router.register(r"course-templates", CourseTemplateViewSet, basename="course-template")
router.register(r"learning-outcomes", LearningOutcomeViewSet, basename="learning-outcome")
router.register(r"course-instances", CourseInstanceViewSet, basename="course-instance")
router.register(r"assessments", AssessmentViewSet, basename="assessment")
router.register(r"grades", GradeViewSet, basename="grade")
router.register(r"users", UserViewSet, basename="user")
router.register(r"assessment-lo-contributions", AssessmentToLOContributionViewSet, basename="assessment-lo-contribution")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
]

urlpatterns += router.urls
