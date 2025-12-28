from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.api.serializers.auth import (
    RegisterSerializer, 
    LoginSerializer, 
    CustomTokenRefreshSerializer,
    LogoutSerializer,
    ChangePasswordSerializer
)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Register a new student",
        description="Register a new student user. Requires a valid .edu email and student ID.",
        responses={
            201: RegisterSerializer,
            400: OpenApiResponse(description="Bad Request")
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    
    @extend_schema(
        summary="Login (Obtain JWT Pair)",
        description="Takes a set of user credentials and returns an access and refresh JSON web token pair to prove the authentication of those credentials.",
        responses={
            200: LoginSerializer,
            401: OpenApiResponse(description="Unauthorized")
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer
    
    @extend_schema(
        summary="Refresh Access Token",
        description="Takes a refresh type JSON web token and returns an access type JSON web token if the refresh token is valid.",
        responses={
            200: CustomTokenRefreshSerializer,
            401: OpenApiResponse(description="Unauthorized")
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LogoutSerializer
    
    @extend_schema(
        summary="Logout (Blacklist Token)",
        description="Blacklists the refresh token.",
        request=LogoutSerializer,
        responses={
            205: OpenApiResponse(description="Successfully logged out"),
            400: OpenApiResponse(description="Bad Request")
        }
    )
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                 return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(generics.GenericAPIView):
    """
    Change the current user's password.
    Clears must_change_password flag after successful change.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    
    @extend_schema(
        summary="Change Password",
        description="Change the current user's password. Clears must_change_password flag on success.",
        request=ChangePasswordSerializer,
        responses={
            200: OpenApiResponse(description="Password changed successfully"),
            400: OpenApiResponse(description="Bad Request - Invalid old password or validation error")
        }
    )
    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.must_change_password = False
        user.save()
        
        return Response({"message": "Password changed successfully."})

