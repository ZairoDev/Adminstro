import {NextRequest, NextResponse} from "next/server";
import Question from "@/models/question";
import {connectDb} from "@/util/db";

connectDb();

export async function PUT(req:NextRequest){
    try{
        const {questionId,title,content}=await req.json();
        if(!questionId || !title || !content){
            return NextResponse.json(
                {error:"Question Id is required"},
                {status:401}
            );
        }

        const question=await Question.findById(questionId);
        if(!question){
            return NextResponse.json(
                {erroe:"question doesn't exist"},
                {status:401}
            )
        }

        question.title=title;
        question.content=content;

        await question.save();

        return NextResponse.json(
            {success:true},
            {status:200}
        )
    }

    catch(error:any){
        return NextResponse.json(
            {success:false,message:error.message},
            {status:500}
        )
    }
}