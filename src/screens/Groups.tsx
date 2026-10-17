import { KeyRound, Plus, Users } from 'lucide-react';
import { useApp } from '../state';
import { Empty } from '../ui/kit';
import { GroupCard } from './common';

export function GroupsScreen() {
  const { groups, groupsReady, go, openJoin } = useApp();
  return (
    <>
      <header className="topbar" style={{ paddingLeft: 20 }}>
        <h1 className="grow">Grupos</h1>
        <button className="btn sm ghost" onClick={() => openJoin()}><KeyRound size={16} /> Código</button>
      </header>
      <div className="scroll" style={{ padding: '6px 16px 24px' }}>
        {groupsReady && groups.length === 0 ? (
          <Empty icon={Users} title="Sem grupos ainda" text="Só vê os grupos que criou ou para onde foi convidado. Crie um ou entre com um código." />
        ) : (
          <div className="group-list">
            {groups.map((g) => <GroupCard key={g.id} g={g} />)}
          </div>
        )}
        <button className="btn mt20" onClick={() => go({ name: 'createGroup' })}><Plus size={20} /> Criar Novo Grupo</button>
      </div>
    </>
  );
}
