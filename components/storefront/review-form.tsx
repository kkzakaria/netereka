"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/storefront/star-rating";
import { submitReview } from "@/actions/reviews";
import { toast } from "sonner";

interface Props {
  productId: string;
  productName: string;
  onDone?: () => void;
}

export function ReviewForm({ productId, productName, onDone }: Props) {
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }
    startTransition(async () => {
      const result = await submitReview({
        productId,
        rating,
        comment: comment || undefined,
      });
      if (result.success) {
        toast.success("Avis publié");
        onDone?.();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-medium">{productName}</p>
      <div className="space-y-1.5">
        <Label>Note</Label>
        <StarRating value={rating} onChange={setRating} size="md" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review-comment">Commentaire (optionnel)</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Partagez votre expérience..."
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Publication..." : "Publier l'avis"}
      </Button>
    </form>
  );
}
