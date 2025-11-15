from rest_framework import serializers
from apps.users.models import User

class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id","email","role","department", "student_id")
        depth = 1
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id","email","role","department","student_id","first_name","last_name","is_active","date_joined"]
        read_only_fields = ["id","date_joined"]
        extra_kwargs = {"password": {"write_only": True}}

        def create(self, validated_data):
            user = User.objects.create_user(**validated_data)
            return user
        def update(self, instance, validated_data):
            if "password" in validated_data:
                instance.set_password(validated_data.pop("password"))
            return super().update(instance, validated_data)