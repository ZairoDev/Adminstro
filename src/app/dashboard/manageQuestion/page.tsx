"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function Page() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null
  );

  const handleSearch = async (term: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post("/api/travellerquestions/getQuestion", {
        title: term,
      });
      setResults(response.data.questions);
    } catch (err) {
      setError("Something went wrong while fetching results");
    } finally {
      setLoading(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!selectedQuestionId) return;
    setLoading(true);
    try {
      setDeleting(true);
      const response = await axios.post(
        "/api/travellerquestions/deleteQuestion",
        {
          questionId: selectedQuestionId,
        }
      );
      if (response.data.success) {
        setResults((prevResults) =>
          prevResults.filter((result: any) => result._id !== selectedQuestionId)
        );
        setDeleting(false);
        toast({
          description: "Question deleted ",
        });
      } else {
        setError("Failed to delete question");
        setDeleting(false);
      }
    } catch (err) {
      setError("Something went wrong while deleting the question");
    } finally {
      setDeleting(false);
      setLoading(false);
      setDialogOpen(false);
      setSelectedQuestionId(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim()) {
      handleSearch(term);
    } else {
      setResults([]);
    }
  };

  useEffect(() => {
    handleSearch("");
  }, []);

  return (
    <div className="">
      <div className="w-full mt-2 flex items-center justify-between">
        <Input
          className="sm:w-1/2 w-full"
          type="text"
          placeholder="Have a question?...."
          value={searchTerm}
          onChange={handleInputChange}
        />
        <div>
          <Link href="/dashboard/createQuestion">
            <Button>Create Question</Button>
          </Link>
        </div>
      </div>
      {loading && (
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      )}
      {error && <p className="mt-4 ">{error}</p>}
      <div className="">
        {results.length > 0
          ? results.map((result: any) => (
              <div key={result._id} className="p-4 mb-2 space-y-1 border-b">
                <h3 className="text-lg font-semibold">{result.title}</h3>
                <p className="font-thin">{result.content}</p>
                <div className="flex items-end justify-end gap-x-2">
                  <Link href={`/dashboard/manageQuestion/${result._id}`}>
                    <Button variant="outline">Edit</Button>
                  </Link>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedQuestionId(result._id);
                      setDialogOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          : !loading &&
            searchTerm.trim() && (
              <div className="mt-10">
                <p className="text-center">
                  Not found anything like that. Add it by tapping <br /> on
                  Create Question
                </p>
              </div>
            )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this question? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Page;
