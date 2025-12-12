
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.api.serializers.users import UserMeSerializer

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get Current User Information",
        description="Retrieve the currently authenticated user's profile information including department and active courses.",
        responses={200: UserMeSerializer},
        tags=["users"]
    )
    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)
