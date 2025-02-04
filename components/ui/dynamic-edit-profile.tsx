"use client"

import { EditProfileButton } from "./edit-profile-button"
import { withDynamicComponent } from "./with-dynamic-component"

// Create dynamic version of EditProfileButton using the HOC
export const DynamicEditProfile = withDynamicComponent("EditProfileButton", EditProfileButton)