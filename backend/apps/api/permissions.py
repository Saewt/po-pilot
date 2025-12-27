from rest_framework import permissions

class IsDepartmentHead(permissions.BasePermission):
    """
    Allocates permissions only to users with the DEPARTMENT_HEAD role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_department_head()
        )

class IsInstructor(permissions.BasePermission):
    """
    Allocates permissions only to users with the INSTRUCTOR role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_instructor()
        )

class IsStudent(permissions.BasePermission):
    """
    Allocates permissions only to users with the STUDENT role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_student()
        )

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute, or checks equality if obj is User.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if obj is the user itself
        if hasattr(obj, 'email') and obj == request.user:
            return True

        # Check if obj has an owner field
        return getattr(obj, 'owner', None) == request.user

class IsCourseInstructor(permissions.BasePermission):
    """
    Object-level permission to allow access only to the instructor of a course instance.
    Handles both CourseInstance objects and related objects (e.g., Assessment).
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # If it's a CourseInstance object directly
        if hasattr(obj, 'instructor'):
            return obj.instructor == request.user
        
        # If it's an Assessment or similar object with course_instance FK
        if hasattr(obj, 'course_instance') and hasattr(obj.course_instance, 'instructor'):
            return obj.course_instance.instructor == request.user
            
        return False

