from flask import Blueprint, request, jsonify
from app.extensions import db, socketio
from app.models.agent import Agent
from app.models.department import Department
from app.models.call import Call

agents_bp = Blueprint('agents', __name__, url_prefix='/api/agents')

@agents_bp.route('', methods=['GET'])
def get_agents():
    dept_id = request.args.get('department_id')
    status = request.args.get('status')

    query = Agent.query
    if dept_id:
        query = query.filter_by(department_id=dept_id)
    if status:
        query = query.filter_by(status=status.upper())

    agents = query.all()
    return jsonify([a.to_dict() for a in agents])

@agents_bp.route('/departments', methods=['GET'])
def get_departments():
    depts = Department.query.all()
    return jsonify([d.to_dict() for d in depts])

@agents_bp.route('/<int:agent_id>', methods=['GET'])
def get_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    return jsonify(agent.to_dict())

@agents_bp.route('/<int:agent_id>/status', methods=['PUT'])
def update_agent_status(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    data = request.get_json() or {}
    status = data.get('status', 'AVAILABLE').upper()

    if status not in ['AVAILABLE', 'BUSY', 'OFFLINE']:
        return jsonify({"error": "Invalid status. Must be AVAILABLE, BUSY, or OFFLINE"}), 400

    agent.status = status
    db.session.commit()

    try:
        socketio.emit('agent:status_change', agent.to_dict())
    except Exception:
        pass

    return jsonify(agent.to_dict())

@agents_bp.route('/<int:agent_id>/calls', methods=['GET'])
def get_agent_calls(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    calls = agent.calls.order_by(Call.created_at.desc()).all()
    return jsonify([c.to_dict() for c in calls])
