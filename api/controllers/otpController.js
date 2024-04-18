const otpGenerator = require("otp-generator");
const OTP = require("../models/otpModels");
const User = require("../models/user");
const { sendVerificationEmail } = require("../utils/mailSender");

// Define the time interval for OTP regeneration (in milliseconds)
const OTP_REGENERATION_INTERVAL = 60 * 60 * 1000; // 1 hour

exports.sendOTP = async (req, res) => {
  try {
    const { Email } = req.body;
    // Check if user is already present
    const checkUserPresent = await User.findOne({ Email });
    // If user found with provided email
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: "User is already registered",
      });
    }

    // Check if there's an existing OTP for this email
    let existingOTP = await OTP.findOne({ Email });

    // If no existing OTP or the last OTP is older than the regeneration interval
    if (
      !existingOTP ||
      Date.now() - existingOTP.createdAt.getTime() >= OTP_REGENERATION_INTERVAL
    ) {
      // Generate a new OTP
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      // Create or update the OTP in the database
      existingOTP = await OTP.findOneAndUpdate(
        { Email },
        { $set: { otp, createdAt: new Date() } },
        { upsert: true, new: true }
      );
    }

    // Send OTP via email
    await sendVerificationEmail(Email, existingOTP.otp);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otp: existingOTP.otp,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
