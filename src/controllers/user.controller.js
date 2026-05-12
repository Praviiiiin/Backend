import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiRespone.js";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})  

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

export const registerUser = asyncHandler(async (req, res, next) => {
    const {fullname, email, username, password} = req.body
    console.log("email :", email); 

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
         throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}] 
    })

    if(existedUser) {
        throw new ApiError(409, "User with username already exists")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    console.log("Avatar path:", avatarLocalPath || "Not provided");
    console.log("Cover image path:", coverImageLocalPath || "Not provided");

    let avatar = null;
    let coverImage = null;
 
    if (avatarLocalPath) {
        console.log(" Uploading avatar to Cloudinary...");
        avatar = await uploadOnCloudinary(avatarLocalPath);
        
        if (!avatar) {
            console.log(" Avatar upload failed");
            throw new ApiError(400, "Avatar upload failed. Please try again.");
        }
        console.log(" Avatar uploaded:", avatar.url);
    } else {
        console.log(" Avatar not provided, continuing without it");
    }
 
    if (coverImageLocalPath) {
        console.log(" Uploading cover image to Cloudinary...");
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        
        if (coverImage) {
            console.log(" Cover image uploaded:", coverImage.url);
        }
    }
 
    const user = await User.create({
        fullname,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError (500, 'Something went wrong while registering the user')
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully ")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const {email, username, password} = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(400, "User does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

     if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        }, 
        "User logged in successfully")
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true 
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200,{}, "User logged out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        User.findById(decodedToken?._id) 
    
         if (!user) {
            throw new ApiError(401, "Invalid")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json (
            new ApiResponse(
                200,
                {accessToken, newRefreshToken}
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message)
    }
})


const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200).json(200, req.user, "Current user fetched successfully")
})

 const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body

    if (!fullname || !email) {
        throw new ApiError(401, "Both fields are required")
    }

    User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullname,
            email
        }
    }, {new:true}).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Acc details updated successfully"))
 })

 const getUserChannelProfile = asyncHandler(async(req, res) => {
     const {username} = req.params

     if (!username?.trim) {
        throw new ApiError(400, "Username is missing")
     }

     const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribed"
                },
                isSubscribed: {
                    $cond: {
                        if: {$sin: [req.user?._id, "$subscribers.subscriber"]}, 
                        then: true,
                        else: false
                    }
                }
            }
        }, 
        {
            $projects: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1, 
                email: 1
            }
        }
     ])

      if(!channel?.length) {
    throw new ApiError(404, "Channel does not exists")
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel Fetched Successfully"))


 })


export {
    loginUser,
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    getUserChannelProfile
}