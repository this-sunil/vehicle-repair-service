import jwt from "jsonwebtoken";
const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, "\n");
export const generateToken = async (user) => {
  const payload = {
    role: user.role
  };
  const decode = jwt.sign(payload, process.env.privateKey, {
    algorithm: "RS256",
    expiresIn:"20m"
  });
  return decode;
};

export const verifyToken=async(req,res,next)=>{
    try {
        const authorization=req.headers.authorization;
        
        if(!authorization || !authorization.startsWith("Bearer ")){
            return res.status(404).json({
                status:false,
                msg:"No Token Provided"
            });
        }
        const token=authorization.split(" ")[1];
        const decode=jwt.verify(token,process.env.publicKey,{algorithms:"RS256",expiresIn:"20m"});
        req.user=decode;
        next();
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:`expire token !!!`
        });
    }
};
