'use client';

import {Button, Skeleton} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import type {JobDescriptionResponse} from '@/lib/types/hire/ai-recruitment';

interface AiJobDescriptionModalProps {
  isOpen: boolean;
  generating: boolean;
  result: JobDescriptionResponse | null;
  onApply: () => void;
  onClose: () => void;
}

function ListSection({id, title, items}: {id: string; title: string; items?: string[]}) {
  if (!items || items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="text-sm font-semibold text-text-1">{title}</h3>
      <ul className="list-inside list-disc space-y-1 text-sm text-text-2">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </section>
  );
}

export function AiJobDescriptionModal({isOpen, generating, result, onApply, onClose}: AiJobDescriptionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>Generated Job Description</ModalHeader>
      <ModalBody>
        {generating ? (
          <div className="flex flex-col gap-2" role="status" aria-live="polite">
            <span className="sr-only">Generating job description with AI...</span>
            <Skeleton height={12} width="40%"/>
            <Skeleton height={12}/>
            <Skeleton height={12} width="90%"/>
            <Skeleton height={12} width="75%"/>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-6">
            {result.summary && (
              <section aria-labelledby="ai-jd-summary-heading" className="flex flex-col gap-2">
                <h3 id="ai-jd-summary-heading" className="text-sm font-semibold text-text-1">Summary</h3>
                <p className="text-sm text-text-2">{result.summary}</p>
              </section>
            )}
            <ListSection id="ai-jd-responsibilities-heading" title="Responsibilities" items={result.responsibilities}/>
            <ListSection id="ai-jd-requirements-heading" title="Requirements" items={result.requirements}/>
            <ListSection id="ai-jd-preferred-quals-heading" title="Preferred Qualifications" items={result.preferredQualifications}/>
            <ListSection id="ai-jd-benefits-heading" title="Benefits" items={result.benefits}/>
          </div>
        ) : null}
      </ModalBody>
      {result && !generating && (
        <ModalFooter>
          <Button variant="default" onClick={onClose}>Discard</Button>
          <Button onClick={onApply}>Apply to Form</Button>
        </ModalFooter>
      )}
    </Modal>
  );
}
