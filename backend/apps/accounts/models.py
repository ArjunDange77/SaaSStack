from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    timezone = models.CharField(max_length=32, default="UTC")

    def __str__(self):
        return self.username
