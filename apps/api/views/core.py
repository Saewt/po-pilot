
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from apps.core.models import ProgramOutcome
from apps.api.serializers.core import ProgramOutcomeSerializer


class ProgramOutcomeViewSet(ReadOnlyModelViewSet):
    queryset = ProgramOutcome.objects.filter(is_active=True)
    serializer_class = ProgramOutcomeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
