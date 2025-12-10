from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from django.core.exceptions import ValidationError

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "email", "password", "password_confirm", "first_name", 
            "last_name", "student_id", "department"
        )
        extra_kwargs = {
            "first_name": {"required": True},
            "last_name": {"required": True},
            "student_id": {"required": True},
            "department": {"required": True},
        }

    def validate_email(self, value):
        if not value.endswith(".edu.tr"):
            raise serializers.ValidationError("Only .edu.tr email addresses are allowed.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_student_id(self, value):
        if not value:
            raise serializers.ValidationError("Student ID is required.")
        if len(value) != 9:
            raise serializers.ValidationError("Student ID must be 9 digits long.")
        if not value.isdigit():
             raise serializers.ValidationError("Student ID must be numeric.")
        if User.objects.filter(student_id=value).exists():
            raise serializers.ValidationError("A user with this Student ID already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        # Force role to STUDENT for self-registration
        validated_data["role"] = "STUDENT" 
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """
    Custom Login Serializer to add extra responses or customize claims if needed in future.
    Currently used to provide proper documentation.
    """
    pass


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Custom Refresh Serializer for documentation.
    """
    pass
