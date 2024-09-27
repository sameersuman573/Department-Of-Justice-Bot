
class ApiError extends Error{
    constructor(
        statusCode,
        message="Something went wrong ",
        errors = [],
        stack = "",
        // error stack
        )
        {
            super(message)
            // mesaage overide is compulsory 

            this.statusCode = statusCode
            this.data = null
            this.message = message
            this.success = false;
            this.errors = errors

            // do log
            if(stack){
                // stack gives the error in which files it is occuring
                this.stack = stack
             }
            else{
                Error.captureStackTrace(this , this.constructor)
            }
        }
}

export {ApiError}