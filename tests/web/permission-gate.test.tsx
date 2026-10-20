// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionGate } from '../../apps/web/src/components/PermissionGate';

describe('visibilidade por permissão', () => {
  it('não renderiza uma ação que o cargo não possui', () => {
    render(
      <PermissionGate permissions={[]} requires="MANAGE_ROLES">
        <button>Criar cargo</button>
      </PermissionGate>,
    );
    expect(screen.queryByRole('button', { name: 'Criar cargo' })).not.toBeInTheDocument();
  });
});
