import React, { useContext, useState, useEffect } from 'react';

import { H2, Tooltip, Button, EditableText } from '@blueprintjs/core';

import { LangConfigContext } from 'sse/localizer/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';
import { apiRequest } from 'sse/api/renderer';

import { Concept as ConceptModel } from 'models/concept';

import styles from './styles.scss';


export const Concept: React.FC<{ id: string }> = function ({ id }) {
  const [concept, updateConcept] = useState(undefined as ConceptModel | undefined);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const [term, updateTerm] = useState('');
  const [definition, updateDefinition] = useState('');
  const [authSource, updateAuthSource] = useState('');

  const lang = useContext(LangConfigContext);

  async function fetchConcept() {
    setLoading(true);
    const _concept = (await apiRequest<ConceptModel>('concept', JSON.stringify({ id: id }))) as ConceptModel;
    updateConcept(_concept);
    setLoading(false);
  }

  async function handleSaveClick() {
    if (concept) {
      setLoading(true);

      const newConcept = {
        ...concept,
        [lang.selected]: {
          ...concept[lang.selected],
          term: term,
          definition: definition,
          authoritative_source: { link: authSource },
        },
      } as ConceptModel;

      if (lang.selected === lang.default) {
        newConcept.term = term;
      }

      await apiRequest<void>('concept', JSON.stringify({ id: id }), JSON.stringify({ newData: newConcept }));

      setDirty(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConcept();
  }, []);

  useEffect(() => {
    if (concept && concept[lang.selected]) {
      updateTerm(concept[lang.selected].term);
      updateDefinition(concept[lang.selected].definition);
      updateAuthSource(concept[lang.selected].authoritative_source.link);
    }
  }, [concept]);

  return (
    <div className={styles.conceptBase}>
      <PaneHeader align="right">Concept&nbsp;<Tooltip content="Concept IDs are set internally and cannot be changed"><span className={styles.conceptIdHighlight}>{id}</span></Tooltip></PaneHeader>

      <H2 className={styles.conceptHeader}>
        <EditableText
          placeholder="Edit term…"
          intent={term.trim() === '' ? "danger" : undefined}
          onChange={(val: string) => { setDirty(true); updateTerm(val) }}
          value={term} />
      </H2>

      <div className={styles.authSource}>
        <EditableText
          placeholder="Edit authoritative source…"
          intent={authSource.trim() === '' ? "danger" : undefined}
          onChange={(val: string) => { setDirty(true); updateAuthSource(val); }}
          value={authSource}/>
        <Tooltip content="Open authoritative source in a new window">
          <Button
            minimal={true}
            small={true}
            intent="primary"
            onClick={() => require('electron').shell.openExternal(authSource)}>Open…</Button>
        </Tooltip>
      </div>

      <div className={styles.conceptDefinition}>
        <EditableText
          placeholder="Edit definition…"
          intent={definition.trim() === '' ? "danger" : undefined}
          multiline={true}
          onChange={(val: string) => { setDirty(true); updateDefinition(val); }}
          value={definition}/>
      </div>

      <footer className={styles.actions}>
        <Button
          disabled={loading || !dirty}
          large={true}
          minimal={false}
          intent="primary"
          onClick={handleSaveClick}
          icon="floppy-disk">Save</Button>
      </footer>
    </div>
  );
};
